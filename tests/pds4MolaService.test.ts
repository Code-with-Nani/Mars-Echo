import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  fetchPds4RangeBytes,
  fetchWithTimeout,
  parseAndValidateContentRange,
} from '../server/pds4MolaService.ts';

test('5. NASA Range request returning valid HTTP 206 with matching Content-Range and exact bytes succeeds', async () => {
  const sampleBytes = new Uint8Array([0xfe, 0xc0, 0x01, 0x2c]); // SignedMSB2: -320m, +300m
  const mockFetch: typeof fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Range'), 'bytes=100-103');
    return new Response(sampleBytes, {
      status: 206,
      headers: {
        'Content-Range': 'bytes 100-103/10000',
      },
    });
  };

  const buf = await fetchPds4RangeBytes(
    'https://example.invalid/megt44n000hb.img',
    100,
    103,
    'megt44n000hb.img',
    { fetchImpl: mockFetch, timeoutMs: 500 }
  );

  assert.equal(buf.byteLength, 4);
  assert.equal(buf.readInt16BE(0), -320);
  assert.equal(buf.readInt16BE(2), 300);
});

test('6. NASA Range request returning HTTP 200 full-file response is rejected cleanly', async () => {
  let bodyCancelled = false;
  const fullBodyStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
    },
    cancel() {
      bodyCancelled = true;
    },
  });

  const mockFetch: typeof fetch = async () => {
    return new Response(fullBodyStream, {
      status: 200,
      headers: { 'Content-Length': '8' },
    });
  };

  await assert.rejects(
    () =>
      fetchPds4RangeBytes(
        'https://example.invalid/megt44n000hb.img',
        100,
        103,
        'megt44n000hb.img',
        { fetchImpl: mockFetch, timeoutMs: 500 }
      ),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /HTTP 200/i);
      assert.match(err.message, /206 Partial Content/i);
      return true;
    }
  );
  assert.equal(bodyCancelled, true);
});

test('7. Incomplete, missing, mismatched Content-Range header, and wrong byte length are rejected', async () => {
  // 7a. Missing Content-Range
  await assert.rejects(
    () =>
      fetchPds4RangeBytes(
        'https://example.invalid/tile.img',
        10,
        13,
        'tile.img',
        {
          fetchImpl: async () =>
            new Response(new Uint8Array([1, 2, 3, 4]), { status: 206 }),
        }
      ),
    /without a Content-Range header/i
  );

  // 7b. Malformed / incomplete Content-Range header
  assert.throws(
    () => parseAndValidateContentRange('bytes 10-13', 10, 13, 'tile.img'),
    /Malformed NASA PDS4 Content-Range/i
  );

  // 7c. Mismatched Content-Range offsets
  await assert.rejects(
    () =>
      fetchPds4RangeBytes(
        'https://example.invalid/tile.img',
        10,
        13,
        'tile.img',
        {
          fetchImpl: async () =>
            new Response(new Uint8Array([1, 2, 3, 4]), {
              status: 206,
              headers: { 'Content-Range': 'bytes 0-3/1000' },
            }),
        }
      ),
    /Content-Range mismatch/i
  );

  // 7d. End >= totalSize in Content-Range
  assert.throws(
    () => parseAndValidateContentRange('bytes 10-13/12', 10, 13, 'tile.img'),
    /Invalid NASA PDS4 Content-Range bounds/i
  );

  // 7e. Returned byte length mismatch (truncated or oversized payload)
  await assert.rejects(
    () =>
      fetchPds4RangeBytes(
        'https://example.invalid/tile.img',
        10,
        13,
        'tile.img',
        {
          fetchImpl: async () =>
            new Response(new Uint8Array([1, 2]), {
              status: 206,
              headers: { 'Content-Range': 'bytes 10-13/1000' },
            }),
        }
      ),
    /Invalid PDS4 raster range byte length.*expected 4 bytes.*received 2 bytes/i
  );
});

test('8. Response body exceeding configured timeout aborts cleanly, clears timer, and does not hang', async () => {
  let socketClosedByAbort = false;

  const server = http.createServer((_req, res) => {
    res.writeHead(206, {
      'Content-Type': 'application/octet-stream',
      'Content-Range': 'bytes 100-103/10000',
      'Content-Length': '4',
    });
    // Send headers + first byte immediately, then stall mid-body
    res.write(Buffer.from([0x01]));
    res.on('close', () => {
      if (!res.writableFinished) {
        socketClosedByAbort = true;
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/stalled.img`;

  try {
    const startedAt = Date.now();
    await assert.rejects(
      () =>
        fetchPds4RangeBytes(url, 100, 103, 'stalled.img', {
          timeoutMs: 80,
        }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /timed out after 80 ms/i);
        return true;
      }
    );
    const elapsed = Date.now() - startedAt;
    assert.ok(elapsed < 1000, `Expected quick timeout (~80ms), took ${elapsed}ms`);

    // Allow TCP FIN/RST propagation to verify underlying socket aborted cleanly
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(
      socketClosedByAbort,
      true,
      'Underlying HTTP body transfer must be aborted on timeout'
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Verify successful fast request also clears timer cleanly without errors
  const okResult = await fetchWithTimeout(
    'https://example.invalid/ok.xml',
    async (res) => await res.text(),
    {
      timeoutMs: 500,
      fetchImpl: async () => new Response('<xml>ok</xml>', { status: 200 }),
    }
  );
  assert.equal(okResult, '<xml>ok</xml>');
});

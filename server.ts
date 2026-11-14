import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  SERVER_ELEVATION_DATASETS,
  fetchPds4MolaElevationPatch,
} from './server/pds4MolaService.ts';

const PORT = Number(process.env.PORT ?? 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function createApp() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'redline-pds4-mola-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/terrain/datasets', (_req, res) => {
    res.json({
      datasets: SERVER_ELEVATION_DATASETS,
    });
  });

  app.get('/api/terrain/mola-grid', async (req, res) => {
    const datasetParam = String(req.query.dataset ?? 'mola-pds4-meg128');
    const minLon = Number(req.query.minLon);
    const minLat = Number(req.query.minLat);
    const maxLon = Number(req.query.maxLon);
    const maxLat = Number(req.query.maxLat);

    if (
      datasetParam !== 'mola-pds4-meg128' &&
      datasetParam !== 'mola-pds4-meg064'
    ) {
      res.status(400).json({
        error: `Dataset "${datasetParam}" is not a live PDS4 MOLA MEGDR dataset.`,
      });
      return;
    }

    if (
      !Number.isFinite(minLon) ||
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLon) ||
      !Number.isFinite(maxLat) ||
      maxLon <= minLon ||
      maxLat <= minLat
    ) {
      res.status(400).json({
        error: 'Invalid bounding box query parameters (minLon, minLat, maxLon, maxLat).',
      });
      return;
    }

    try {
      const payload = await fetchPds4MolaElevationPatch(datasetParam, [
        minLon,
        minLat,
        maxLon,
        maxLat,
      ]);
      res.json(payload);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to retrieve NASA PDS4 MOLA MEGDR elevation data.';
      res.status(502).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  return app;
}

createApp()
  .then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[REDLINE] Express + PDS4 MOLA server listening on http://0.0.0.0:${PORT} (${IS_PROD ? 'production' : 'development'})`
      );
    });
  })
  .catch((err) => {
    console.error('[REDLINE] Failed to start server:', err);
    process.exit(1);
  });

import type { CoordinateFormat, ScaleUnit } from '../types/mars';

/** IAU 2000 Mars Equatorial Radius in kilometers */
export const MARS_EQUATORIAL_RADIUS_KM = 3396.19;

/**
 * Normalize planetocentric longitude into [-180, 180].
 */
export function normalizeLon(lon: number): number {
  let normalized = ((lon + 180) % 360 + 360) % 360 - 180;
  if (normalized === -180 && lon > 0) normalized = 180;
  return normalized;
}

/**
 * Clamp latitude into [-90, 90].
 */
export function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

export function formatLat(lat: number, format: CoordinateFormat, decimals = 4): string {
  const clamped = clampLat(lat);
  if (format === 'decimal' || format === 'east360') {
    return `${clamped.toFixed(decimals)}°`;
  }
  const hemi = clamped >= 0 ? 'N' : 'S';
  return `${Math.abs(clamped).toFixed(decimals)}° ${hemi}`;
}

export function formatLon(lon: number, format: CoordinateFormat, decimals = 4): string {
  const norm = normalizeLon(lon);
  if (format === 'decimal') {
    return `${norm.toFixed(decimals)}°`;
  }
  if (format === 'east360') {
    const east = ((norm % 360) + 360) % 360;
    return `${east.toFixed(decimals)}° E`;
  }
  const hemi = norm >= 0 ? 'E' : 'W';
  return `${Math.abs(norm).toFixed(decimals)}° ${hemi}`;
}

export function formatCoordinatePair(
  lat: number,
  lon: number,
  format: CoordinateFormat,
  decimals = 4
): string {
  return `${formatLat(lat, format, decimals)}, ${formatLon(lon, format, decimals)}`;
}

/**
 * Parses user search queries like:
 * - "18.3847, 77.4509"
 * - "18.38° N, 77.45° E"
 * - "5.37S 137.81E"
 * - "18.65N, 226.2E" (0..360 East convention)
 */
export function parseMarsCoordinateQuery(
  rawQuery: string
): { lat: number; lon: number } | null {
  const query = rawQuery.trim();
  if (!query) return null;

  const coordRegex =
    /^\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,\s;/]+\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])?\s*$/;
  const match = query.match(coordRegex);
  if (!match) return null;

  let lat = parseFloat(match[1]);
  const latDir = match[2]?.toUpperCase();
  let lon = parseFloat(match[3]);
  const lonDir = match[4]?.toUpperCase();

  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

  if (latDir === 'S') lat = -Math.abs(lat);
  else if (latDir === 'N') lat = Math.abs(lat);

  if (lonDir === 'W') lon = -Math.abs(lon);
  else if (lonDir === 'E') lon = Math.abs(lon);

  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 360) return null;

  return {
    lat: clampLat(lat),
    lon: normalizeLon(lon),
  };
}

/**
 * Computes a clean planetary scale bar length and pixel width
 * for an Equirectangular (EPSG:4326) view on Mars.
 *
 * @param resolutionDegPerPx Current OpenLayers view resolution (degrees / px)
 * @param centerLatDeg Current center latitude in degrees
 * @param unit Display unit ('metric' or 'miles')
 * @param targetMaxPx Maximum desired bar width in CSS pixels
 */
export function computeMarsScaleBar(
  resolutionDegPerPx: number,
  centerLatDeg: number,
  unit: ScaleUnit = 'metric',
  targetMaxPx = 128
): { widthPx: number; label: string } {
  if (!Number.isFinite(resolutionDegPerPx) || resolutionDegPerPx <= 0) {
    return { widthPx: 80, label: '—' };
  }

  // Clamp cos(lat) at high latitudes so bar stays mathematically meaningful
  const cosLat = Math.max(0.15, Math.cos((clampLat(centerLatDeg) * Math.PI) / 180));
  const kmPerDeg = ((2 * Math.PI * MARS_EQUATORIAL_RADIUS_KM) / 360) * cosLat;
  const kmPerPx = resolutionDegPerPx * kmPerDeg;

  const niceStepsKm = [
    0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000,
  ];
  const niceStepsMi = [
    0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000,
  ];

  if (unit === 'miles') {
    const miPerPx = kmPerPx * 0.621371;
    let chosen = niceStepsMi[0];
    for (const step of niceStepsMi) {
      if (step / miPerPx <= targetMaxPx) {
        chosen = step;
      }
    }
    const widthPx = Math.max(32, Math.round(chosen / miPerPx));
    return { widthPx, label: `${chosen} mi` };
  }

  let chosenKm = niceStepsKm[0];
  for (const step of niceStepsKm) {
    if (step / kmPerPx <= targetMaxPx) {
      chosenKm = step;
    }
  }
  const widthPx = Math.max(32, Math.round(chosenKm / kmPerPx));
  const label = chosenKm < 1 ? `${Math.round(chosenKm * 1000)} m` : `${chosenKm} km`;
  return { widthPx, label };
}

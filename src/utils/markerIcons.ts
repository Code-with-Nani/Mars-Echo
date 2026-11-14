import type { MarkerCategory } from '../types/mars';

/**
 * Generates crisp SVG data-URI markers for OpenLayers Icon styles
 * using strictly the 8 official brand colors.
 */
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MARKER_ICON_URIS: Record<Exclude<MarkerCategory, 'custom'>, string> = {
  // Astronaut: Neon Yellow beacon ring + Deep Blue visor core
  astronaut: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <circle cx="13" cy="13" r="10.5" fill="#07173F" stroke="#EAFE07" stroke-width="2.2"/>
      <circle cx="13" cy="9.5" r="3" fill="#EAFE07"/>
      <path d="M8 18.5c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `),

  // Habitat / Base: Blue Yonder hexagonal dome + White stroke
  habitat: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <polygon points="13,2 23,7.8 23,18.2 13,24 3,18.2 3,7.8" fill="#0042A6" stroke="#2F96F5" stroke-width="2"/>
      <path d="M8 16.5h10v-2.2a5 5 0 0 0-10 0v2.2z" fill="#FFFFFF"/>
      <rect x="11.5" y="13.5" width="3" height="3" fill="#07173F"/>
    </svg>
  `),

  // Rover: Neon Blue rounded square chassis + White wheels & mast
  rover: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
      <rect x="2.5" y="2.5" width="21" height="21" rx="4" fill="#07173F" stroke="#0960E1" stroke-width="2.2"/>
      <rect x="7" y="11" width="12" height="5" rx="1" fill="#2F96F5"/>
      <line x1="15.5" y1="11" x2="15.5" y2="7" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="15.5" cy="6.5" r="1.3" fill="#EAFE07"/>
      <circle cx="9" cy="18" r="1.8" fill="#FFFFFF"/>
      <circle cx="17" cy="18" r="1.8" fill="#FFFFFF"/>
    </svg>
  `),

  // Scientific Destination: Rocket Red diamond geological marker + White outline
  science: svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <polygon points="12,2 22,12 12,22 2,12" fill="#8E1100" stroke="#E43700" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
    </svg>
  `),
};

export const MARKER_CATEGORY_META: Record<
  MarkerCategory,
  { label: string; shortLabel: string; colorHex: string }
> = {
  astronaut: {
    label: 'Astronaut (EVA)',
    shortLabel: 'Astronaut',
    colorHex: '#EAFE07',
  },
  habitat: {
    label: 'Habitat / Base',
    shortLabel: 'Habitat',
    colorHex: '#2F96F5',
  },
  rover: {
    label: 'Surface Rover',
    shortLabel: 'Rover',
    colorHex: '#0960E1',
  },
  science: {
    label: 'Scientific Destination',
    shortLabel: 'Science',
    colorHex: '#E43700',
  },
  custom: {
    label: 'Selected Surface Point',
    shortLabel: 'Custom',
    colorHex: '#EAFE07',
  },
};

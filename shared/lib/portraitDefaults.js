const STATBLOCK_PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a2d35"/>
      <stop offset="100%" stop-color="#16181e"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" fill="url(#bg)"/>
  <circle cx="128" cy="96" r="44" fill="#4d5566"/>
  <path d="M44 214c14-43 47-64 84-64s70 21 84 64" fill="#4d5566"/>
  <text x="128" y="238" text-anchor="middle" fill="#aeb7c8" font-family="Georgia, serif" font-size="16">
    No portrait
  </text>
</svg>
`.trim()

export const DEFAULT_STATBLOCK_PORTRAIT_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(STATBLOCK_PLACEHOLDER_SVG)}`


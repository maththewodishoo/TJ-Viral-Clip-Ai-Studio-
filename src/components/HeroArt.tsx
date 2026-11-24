export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 220"
      className={className}
      role="img"
      aria-label="Illustration of an AI presenter in a neon holographic studio"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="halo" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.55" />
          <stop offset="65%" stopColor="#4c1d95" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0a0618" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b3b8a" />
          <stop offset="100%" stopColor="#2a1a4d" />
        </linearGradient>
        <linearGradient id="suit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c1540" />
          <stop offset="100%" stopColor="#0d0922" />
        </linearGradient>
        <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
        </linearGradient>
        <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="250" cy="120" rx="170" ry="130" fill="url(#halo)" />
      <g opacity="0.35" stroke="#8b5cf6" strokeWidth="0.6">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1="60" y1={48 + i * 32} x2="360" y2={48 + i * 32} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`v${i}`} x1={80 + i * 48} y1="20" x2={80 + i * 48} y2="220" />
        ))}
      </g>

      {/* floating panel with play button */}
      <g transform="translate(48 52)">
        <rect width="96" height="96" rx="18" fill="#0b0722" stroke="url(#screen)" strokeWidth="1.2" opacity="0.95" />
        <rect width="96" height="96" rx="18" fill="url(#screen)" opacity="0.08" />
        <circle cx="48" cy="44" r="21" fill="url(#screen)" opacity="0.2" />
        <path d="M43 34.5 59 44 43 53.5Z" fill="#e9e6ff" filter="url(#glow)" />
        <rect x="20" y="72" width="56" height="4" rx="2" fill="#a855f7" opacity="0.55" />
        <rect x="20" y="80" width="34" height="3" rx="1.5" fill="#22d3ee" opacity="0.5" />
      </g>
      <g transform="translate(36 26)" opacity="0.9">
        <rect width="44" height="16" rx="8" fill="#160d33" stroke="#3b2a6d" />
        <circle cx="9" cy="8" r="3" fill="#34d399" />
        <rect x="16" y="6" width="20" height="4" rx="2" fill="#6d5aa8" />
      </g>

      {/* presenter */}
      <g>
        <ellipse cx="252" cy="205" rx="74" ry="26" fill="url(#suit)" />
        <path d="M190 206c2-30 18-52 34-58l28-6 28 6c16 6 32 28 34 58Z" fill="url(#suit)" />
        <path d="M188 208c2-30 18-52 34-58l28-6" fill="none" stroke="url(#rim)" strokeWidth="1.6" opacity="0.85" />
        <path d="M314 208c-2-30-18-52-34-58l-28-6" fill="none" stroke="url(#rim)" strokeWidth="1.6" opacity="0.6" />
        <path d="M232 146h40v24c0 9-9 14-20 14s-20-5-20-14Z" fill="url(#skin)" />
        <ellipse cx="252" cy="112" rx="42" ry="48" fill="url(#skin)" />
        {/* hair */}
        <path d="M208 110c-2-34 18-56 44-56s46 22 44 56c-4-14-10-22-16-26-16 10-40 12-58 4-6 5-11 14-14 22Z" fill="#140b2c" />
        <path d="M208 104c-8 26-10 52-6 76 4 20 14 28 22 24-10-26-12-58-8-88Z" fill="#160c31" />
        <path d="M296 104c8 26 10 52 6 76-4 20-14 28-22 24 10-26 12-58 8-88Z" fill="#160c31" />
        {/* braids */}
        <g stroke="#221245" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M204 132c-6 22-8 40-6 56" />
          <path d="M212 142c-4 16-6 30-5 42" />
          <path d="M300 132c6 22 8 40 6 56" />
          <path d="M292 142c4 16 6 30 5 42" />
        </g>
        {/* visor */}
        <rect x="222" y="100" width="60" height="17" rx="8.5" fill="#0b0722" stroke="url(#screen)" strokeWidth="1.4" />
        <rect x="226" y="104" width="52" height="9" rx="4.5" fill="url(#screen)" opacity="0.55" filter="url(#glow)" />
        <path d="M231 108h14M251 108h18" stroke="#e9e6ff" strokeWidth="1.6" opacity="0.7" strokeLinecap="round" />
        {/* rim light */}
        <path d="M214 92c6-22 20-34 38-34 16 0 30 10 38 28" fill="none" stroke="url(#rim)" strokeWidth="2" opacity="0.9" filter="url(#glow)" />
        <path d="M233 150c5 4 12 6 19 6s14-2 19-6" fill="none" stroke="#a855f7" strokeWidth="1.4" opacity="0.6" />
        <path d="M246 124c4 4 8 5 12 2" fill="none" stroke="#22d3ee" strokeWidth="1.3" opacity="0.6" />
      </g>

      {/* pointing hand */}
      <g>
        <path d="M318 150c16-6 30-14 38-20" stroke="url(#skin)" strokeWidth="13" strokeLinecap="round" fill="none" />
        <circle cx="357" cy="129" r="7" fill="url(#skin)" />
      </g>

      <g opacity="0.65">
        <circle cx="320" cy="56" r="3" fill="#22d3ee" filter="url(#glow)" />
        <circle cx="342" cy="86" r="2" fill="#a855f7" />
        <circle cx="176" cy="64" r="2" fill="#f472b6" />
        <rect x="298" y="30" width="34" height="10" rx="5" fill="#160d33" stroke="#3b2a6d" />
        <rect x="304" y="34" width="16" height="2" rx="1" fill="#22d3ee" opacity="0.7" />
      </g>
      <ellipse cx="252" cy="216" rx="120" ry="10" fill="#7c3aed" opacity="0.25" filter="url(#soft)" />
    </svg>
  );
}

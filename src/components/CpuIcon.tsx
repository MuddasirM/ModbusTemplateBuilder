interface Props {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function CpuIcon({ size = 24, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {/* IC package body */}
      <rect x="27" y="27" width="46" height="46" />

      {/* Pin 1 orientation dot - top-left corner inside the package */}
      <circle cx="33" cy="33" r="2.5" fill="currentColor" stroke="none" />

      {/* Left pins */}
      <line x1="27" y1="36" x2="18" y2="36" />
      <line x1="27" y1="44" x2="18" y2="44" />
      <line x1="27" y1="56" x2="18" y2="56" />
      <line x1="27" y1="64" x2="18" y2="64" />

      {/* Right pins */}
      <line x1="73" y1="36" x2="82" y2="36" />
      <line x1="73" y1="44" x2="82" y2="44" />
      <line x1="73" y1="56" x2="82" y2="56" />
      <line x1="73" y1="64" x2="82" y2="64" />

      {/* Top pins */}
      <line x1="36" y1="27" x2="36" y2="18" />
      <line x1="44" y1="27" x2="44" y2="18" />
      <line x1="56" y1="27" x2="56" y2="18" />
      <line x1="64" y1="27" x2="64" y2="18" />

      {/* Bottom pins */}
      <line x1="36" y1="73" x2="36" y2="82" />
      <line x1="44" y1="73" x2="44" y2="82" />
      <line x1="56" y1="73" x2="56" y2="82" />
      <line x1="64" y1="73" x2="64" y2="82" />

      {/* Trace A: left pin 2 - straight to pad */}
      <line x1="18" y1="44" x2="7" y2="44" />
      <circle cx="7" cy="44" r="4" strokeWidth="4" />

      {/* Trace B: left pin 3 - L-turn down to pad */}
      <polyline points="18,56 8,56 8,68" />
      <circle cx="8" cy="68" r="4" strokeWidth="4" />

      {/* Trace C: right pin 1 - straight to pad */}
      <line x1="82" y1="36" x2="93" y2="36" />
      <circle cx="93" cy="36" r="4" strokeWidth="4" />

      {/* Trace D: top pin 3 - L-turn left to pad */}
      <polyline points="56,18 56,10 42,10 42,7" />
      <circle cx="42" cy="7" r="4" strokeWidth="4" />

      {/* Trace E: bottom pin 2 - straight to pad */}
      <line x1="44" y1="82" x2="44" y2="93" />
      <circle cx="44" cy="93" r="4" strokeWidth="4" />
    </svg>
  );
}

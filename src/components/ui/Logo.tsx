/** Logo: pătrat din linii diagonale (semnal / mișcare). */
export function Logo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <defs>
        <clipPath id="logo-clip">
          <rect x="2" y="2" width="20" height="20" />
        </clipPath>
      </defs>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" stroke="currentColor" strokeWidth="1.5" />
      <g clipPath="url(#logo-clip)" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 14L14 2M2 20L20 2M6 22L22 6M12 22L22 12" />
      </g>
    </svg>
  );
}

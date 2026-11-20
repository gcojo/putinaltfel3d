/** Raport lățime/înălțime al inimioarei (imaginile sunt deja rotite cu −6°, ca sticker). */
const RATIO = 95 / 128;
/** Variante pre-randate: browserul alege fișierul potrivit densității ecranului, fără blur de redimensionare. */
const SRCSET = '/heart-128.png 95w, /heart-256.png 189w, /heart-512.png 377w';

/**
 * Logo „#putinALTFEL” – inimioara-sticker de pe razvantofan.ro.
 * `size` = înălțimea în pixeli. Umbră de sticker; la hover se îndreaptă ușor.
 */
export function Logo({ size = 24, className = '', still = false }: { size?: number; className?: string; still?: boolean }) {
  const width = Math.round(size * RATIO);
  return (
    <img
      src="/heart-256.png"
      srcSet={SRCSET}
      sizes={`${width}px`}
      alt=""
      aria-hidden
      draggable={false}
      height={size}
      width={width}
      style={{ height: size, width }}
      className={`shrink-0 select-none drop-shadow-sticker ${
        still ? '' : 'transition-transform duration-300 ease-bounce hover:rotate-6 hover:scale-105'
      } ${className}`}
    />
  );
}

/** Semnul de brand: inimioară + „Răzvan Tofan” + numele departamentului. */
export function BrandMark({ size = 40, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="group flex min-w-0 items-center gap-3">
      <Logo size={size} className="group-hover:rotate-6 group-hover:scale-105" />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate font-display text-[17px] font-medium tracking-[0.02em] text-fg">Răzvan Tofan</span>
          <span className="mt-1 truncate text-[9px] font-medium uppercase tracking-[0.2em] text-accent">putinALTFEL · 3D</span>
        </span>
      )}
    </span>
  );
}

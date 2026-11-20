/**
 * Logo „#putinALTFEL” – inimioara-sticker de pe razvantofan.ro.
 * `size` = înălțimea în pixeli. Ușor rotit, cu umbră de sticker; se îndreaptă la hover.
 */
export function Logo({ size = 24, className = '', still = false }: { size?: number; className?: string; still?: boolean }) {
  return (
    <img
      src="/heart.png"
      alt=""
      aria-hidden
      draggable={false}
      height={size}
      width={Math.round(size * 0.685)}
      style={{ height: size, width: 'auto' }}
      className={`shrink-0 select-none drop-shadow-sticker ${
        still ? '' : '-rotate-6 transition-transform duration-300 ease-bounce hover:rotate-0 hover:scale-105'
      } ${className}`}
    />
  );
}

/** Semnul de brand: inimioară + „Răzvan Tofan” + numele departamentului. */
export function BrandMark({ size = 40, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="group flex min-w-0 items-center gap-3">
      <Logo size={size} className="group-hover:rotate-0 group-hover:scale-105" />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate font-display text-[17px] font-medium tracking-[0.02em] text-fg">Răzvan Tofan</span>
          <span className="mt-1 truncate text-[9px] font-medium uppercase tracking-[0.2em] text-accent">putinALTFEL · 3D</span>
        </span>
      )}
    </span>
  );
}

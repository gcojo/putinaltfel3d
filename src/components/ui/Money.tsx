import { num } from '@/lib/format';

/** Sumă mare cu unitatea mică, gri (pentru KPI-uri). */
export function Money({ value, unit = 'lei' }: { value: number; unit?: string }) {
  return (
    <>
      {num(Math.round(value))}
      <span className="ml-1.5 text-base font-normal tracking-normal text-muted">{unit}</span>
    </>
  );
}

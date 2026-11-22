import { num } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';

/** Sumă mare cu unitatea mică, gri (pentru KPI-uri). Cifra numără animat până la valoare. */
export function Money({ value, unit = 'lei' }: { value: number; unit?: string }) {
  const shown = useCountUp(value);
  return (
    <>
      {num(Math.round(shown))}
      <span className="ml-1.5 text-base font-normal tracking-normal text-muted">{unit}</span>
    </>
  );
}

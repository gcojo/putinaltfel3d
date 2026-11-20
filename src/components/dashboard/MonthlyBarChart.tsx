import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { num } from '@/lib/format';

/**
 * Grafic de bare lunar, o singură serie (monocrom: culoarea e rezervată pentru semnale).
 * Luna curentă e evidențiată în alb, restul în gri.
 */
export function MonthlyBarChart<T extends { key: string; label: string }>({
  data, dataKey, format, height = 200, unit = '',
}: {
  data: T[];
  dataKey: keyof T & string;
  format: (v: number) => string;
  height?: number;
  unit?: string;
}) {
  const last = data.at(-1)?.key;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <defs>
            <linearGradient id="bar-current" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F08A6C" />
              <stop offset="100%" stopColor="#D8423F" />
            </linearGradient>
            <linearGradient id="bar-rest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(216,66,63,0.32)" />
              <stop offset="100%" stopColor="rgba(216,66,63,0.08)" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(26,23,20,0.07)" strokeDasharray="3 4" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'rgba(26,23,20,0.12)' }} tick={{ fill: '#6B6660', fontSize: 10 }} interval="preserveStartEnd" minTickGap={4} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: '#A39D95', fontSize: 10 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${num(v / 1000, 1)}k` : num(v))}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(216,66,63,0.06)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="glass-panel rounded px-3 py-2 text-sm">
                  <div className="label mb-1">{label}</div>
                  <div className="num text-fg">
                    {format(Number(payload[0].value))}
                    {unit}
                  </div>
                </div>
              ) : null
            }
          />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.key === last ? 'url(#bar-current)' : 'url(#bar-rest)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

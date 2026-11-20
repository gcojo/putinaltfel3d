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
          <CartesianGrid vertical={false} stroke="#22262D" strokeDasharray="0" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#22262D' }} tick={{ fill: '#8A9099', fontSize: 10 }} interval="preserveStartEnd" minTickGap={4} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            tick={{ fill: '#5C626B', fontSize: 10 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${num(v / 1000, 1)}k` : num(v))}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="rounded border border-line bg-surface-2 px-3 py-2 text-sm">
                  <div className="label mb-1">{label}</div>
                  <div className="num text-fg">
                    {format(Number(payload[0].value))}
                    {unit}
                  </div>
                </div>
              ) : null
            }
          />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.key === last ? '#FFFFFF' : '#5C626B'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

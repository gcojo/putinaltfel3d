// Fișier de calendar (.ics) cu alarmă: pe telefon sună sigur, chiar dacă aplicația e închisă.

const pad = (n: number) => String(n).padStart(2, '0');
const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

export function printAlarmIcs(opts: { id: number; title: string; end: Date; description?: string; now?: Date }): string {
  const start = opts.end;
  const stop = new Date(start.getTime() + 15 * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Print3D Control//RO',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:print-${opts.id}-${start.getTime()}@print3d`,
    `DTSTAMP:${utc(opts.now ?? new Date())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(stop)}`,
    `SUMMARY:${esc(opts.title)}`,
    ...(opts.description ? [`DESCRIPTION:${esc(opts.description)}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(opts.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadFile(name: string, content: string, type = 'text/calendar;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

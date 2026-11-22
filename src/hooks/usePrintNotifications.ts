// Notificare „printul ar trebui să fie gata” la ora estimată de final.
// Funcționează cât timp aplicația e deschisă (și în fundal, pe calculator / Android).
import { useEffect } from 'react';
import { useData } from './useData';

export const NOTIF_KEY = 'notif-print';
const SENT_KEY = 'notif-print-sent';
/** după atâta timp de la final, nu mai trimitem notificarea (ex. aplicația deschisă a doua zi) */
const STALE_MS = 12 * 3_600_000;

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

export function notificationsOn(): boolean {
  try {
    return notificationsSupported() && Notification.permission === 'granted' && localStorage.getItem(NOTIF_KEY) === '1';
  } catch {
    return false;
  }
}

function sentSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
function markSent(key: string) {
  try {
    const all = [...sentSet(), key].slice(-50);
    localStorage.setItem(SENT_KEY, JSON.stringify(all));
  } catch {
    /* stocare indisponibilă */
  }
}

export async function showNotification(title: string, body: string, tag: string) {
  const icon = `${import.meta.env.BASE_URL}icon-192.png`;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) return await reg.showNotification(title, { body, icon, badge: icon, tag });
  } catch {
    /* cade pe varianta simplă */
  }
  new Notification(title, { body, icon, tag });
}

export function usePrintNotifications() {
  const { schedule } = useData();
  useEffect(() => {
    if (!notificationsOn()) return;
    const timers: number[] = [];
    for (const item of schedule.items.filter((i) => i.isPrinting)) {
      const o = item.order;
      const key = `${o.id}-${o.data_start}`;
      if (sentSet().has(key)) continue;
      const fire = () => {
        if (sentSet().has(key)) return;
        markSent(key);
        showNotification(`Printul #${o.id} ar trebui să fie gata`, `${o.titlu} · verifică imprimanta și marchează comanda finalizată.`, `print-${o.id}`);
      };
      const delay = item.end.getTime() - Date.now();
      if (delay <= 0) {
        if (-delay < STALE_MS) fire();
      } else {
        timers.push(window.setTimeout(fire, Math.min(delay, 2_147_000_000)));
      }
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [schedule]);
}

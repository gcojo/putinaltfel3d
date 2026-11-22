// Mesaje rapide către client (WhatsApp / apel) cu text precompletat.
import type { Order } from '@/types/db';
import { amountDue } from './calc';
import { missingPrintInfo } from './design';
import { lei } from './format';

/** „0722 123 456” / „+40 722…” / „0040722…” -> „40722123456” (format wa.me). null dacă nu pare valid. */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `40${d.slice(1)}`; // număr românesc local
  d = d.replace(/\D/g, '');
  return d.length >= 8 ? d : null;
}

export function waLink(phone: string | null | undefined, text: string): string | null {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

export function telLink(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const d = phone.replace(/[^\d+]/g, '');
  return d.length >= 6 ? `tel:${d}` : null;
}

export interface MessageTemplate {
  id: string;
  label: string;
  text: string;
}

/** Mesajele potrivite pentru starea comenzii (cele mai relevante primele). */
export function messageTemplates(order: Order, clientName?: string | null): MessageTemplate[] {
  const hi = `Bună${clientName ? ` ${clientName.split(' ')[0]}` : ''}!`;
  const ref = `comanda „${order.titlu}”`;
  const due = amountDue(order);
  const rest = due > 0 ? ` Rest de plată: ${lei(due)}.` : '';
  const out: MessageTemplate[] = [];

  if (order.status === 'finalizata') {
    out.push({ id: 'gata', label: 'E gata', text: `${hi} ${cap(ref)} e gata și te așteaptă.${rest} Spune-mi când îți convine să o ridici. Mulțumesc!` });
  }
  if (due > 0 && (order.status === 'finalizata' || order.status === 'livrata')) {
    out.push({ id: 'plata', label: 'Reamintire plată', text: `${hi} Îți reamintesc de plata pentru ${ref}: ${lei(due)}. Mulțumesc!` });
  }
  if ((order.status === 'noua' || order.status === 'in_coada') && !missingPrintInfo(order) && Number(order.pret_vanzare) > 0) {
    out.push({ id: 'pret', label: 'Trimite prețul', text: priceMessage(order, clientName) });
  }
  if (order.status === 'noua' || order.status === 'in_coada') {
    out.push({ id: 'primit', label: 'Am primit comanda', text: `${hi} Am primit ${ref}${Number(order.pret_vanzare) > 0 ? ` (${lei(Number(order.pret_vanzare))})` : ''} și am pus-o în lucru. Te anunț când e gata!` });
  }
  if (order.status === 'se_printeaza') {
    out.push({ id: 'print', label: 'Se printează', text: `${hi} ${cap(ref)} se printează chiar acum. Te anunț imediat ce e gata!` });
  }
  if (['noua', 'in_coada', 'se_printeaza'].includes(order.status)) {
    out.push({ id: 'intarziere', label: 'Întârziere', text: `${hi} Îmi pare rău, ${ref} va întârzia puțin. Revin cu o dată exactă cât de curând.` });
  }
  return out;
}

/** După proiectare: prețul final către client. */
export function priceMessage(order: Order, clientName?: string | null): string {
  const hi = `Bună${clientName ? ` ${clientName.split(' ')[0]}` : ''}!`;
  const n = Number(order.nr_bucati);
  const buc = n > 1 ? ` pentru ${n} bucăți` : '';
  return `${hi} Am terminat proiectul pentru comanda „${order.titlu}”. Prețul este ${lei(Number(order.pret_vanzare))}${buc}. Dacă e ok, o pun la printat și te anunț când e gata!`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Comenzi „de proiectat”: create fără gramele și timpul de print (se completează după proiectare).
import type { Order } from '@/types/db';

/** Lipsesc gramele sau durata de print (comanda a fost adăugată înainte de proiectare). */
export function missingPrintInfo(o: Pick<Order, 'grame_filament' | 'durata_print_ore'>): boolean {
  return !(Number(o.durata_print_ore) > 0) || !(Number(o.grame_filament) > 0);
}

/** Comandă activă care așteaptă proiectarea (fără date de print). */
export function needsDesign(o: Pick<Order, 'grame_filament' | 'durata_print_ore' | 'status'>): boolean {
  return (o.status === 'noua' || o.status === 'in_coada') && missingPrintInfo(o);
}

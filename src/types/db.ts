// Tipuri pentru toate tabelele din Supabase (vezi supabase/migrations/0001_schema.sql)

export type OrderStatus = 'noua' | 'in_coada' | 'se_printeaza' | 'finalizata' | 'livrata' | 'anulata';
export type Priority = 'normala' | 'urgenta';
export type PaidStatus = 'da' | 'nu' | 'partial';
export type PaymentMethod = 'numerar' | 'transfer' | 'card' | 'altul';

export interface Settings {
  user_id: string;
  pret_filament_lei_kg: Record<string, number>;
  cost_curent_lei_kwh: number;
  consum_imprimanta_w: number;
  ore_de_printare_pe_zi: number;
  ora_inceput_zi: number;
  /** 0 = duminică … 6 = sâmbătă */
  zile_libere: number[];
  /** YYYY-MM-DD */
  date_libere: string[];
  adaos_procent: number;
  updated_at: string;
}

export interface Client {
  id: number;
  user_id: string;
  nume: string;
  telefon: string | null;
  email: string | null;
  oras: string | null;
  note: string | null;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: string;
  client_id: number | null;
  titlu: string;
  descriere: string | null;
  material: string;
  culoare: string | null;
  /** total pentru toată comanda */
  grame_filament: number;
  /** total pentru toată comanda */
  durata_print_ore: number;
  nr_bucati: number;
  pret_vanzare: number;
  /** calculat automat în baza de date */
  cost_material: number;
  status: OrderStatus;
  prioritate: Priority;
  /** YYYY-MM-DD */
  data_comanda: string;
  /** YYYY-MM-DD */
  deadline: string | null;
  data_start: string | null;
  data_finalizare: string | null;
  /** calculat din încasări */
  platit: PaidStatus;
  /** calculat din încasări */
  suma_incasata: number;
  note: string | null;
  /** calea în bucket-ul „poze-comenzi” */
  poza_url: string | null;
  pozitie_in_coada: number | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  user_id: string;
  order_id: number;
  suma: number;
  /** YYYY-MM-DD */
  data: string;
  metoda: PaymentMethod;
  note: string | null;
  created_at: string;
}

export interface OrderEvent {
  id: number;
  user_id: string;
  order_id: number;
  tip: string;
  detalii: string | null;
  created_at: string;
}

/** Câmpurile editabile ale unei comenzi (restul sunt calculate de baza de date). */
export type OrderInput = Pick<
  Order,
  | 'client_id' | 'titlu' | 'descriere' | 'material' | 'culoare' | 'grame_filament' | 'durata_print_ore'
  | 'nr_bucati' | 'pret_vanzare' | 'status' | 'prioritate' | 'data_comanda' | 'deadline' | 'note' | 'poza_url'
>;

export type ClientInput = Pick<Client, 'nume' | 'telefon' | 'email' | 'oras' | 'note'>;

export type PaymentInput = Pick<Payment, 'order_id' | 'suma' | 'data' | 'metoda' | 'note'>;

export type SettingsInput = Omit<Settings, 'user_id' | 'updated_at'>;

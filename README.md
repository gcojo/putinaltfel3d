# Print 3D · Control

Panou de administrare pentru afacerea de printare 3D (o imprimantă **Bambu Lab A1**).
Comenzi, coadă de printare cu estimări automate, clienți, încasări, statistici și export CSV.
Totul în română, cu sume în RON, instalabil pe telefon ca aplicație (PWA).

**Tehnologii (toate gratuite):** React + Vite + TypeScript + Tailwind CSS · Supabase (bază de date, autentificare, stocare poze) · Recharts · Cloudflare Pages sau Netlify (hosting).

---

## Cuprins

1. [Ce îți trebuie](#1-ce-îți-trebuie)
2. [Creează contul și proiectul Supabase](#2-creează-contul-și-proiectul-supabase)
3. [Rulează migrațiile SQL (creează baza de date)](#3-rulează-migrațiile-sql)
4. [Creează userul admin](#4-creează-userul-admin)
5. [(Opțional) Încarcă datele de test](#5-opțional-încarcă-datele-de-test)
6. [Pornește aplicația pe calculator](#6-pornește-aplicația-pe-calculator)
7. [Publică aplicația pe internet](#7-publică-aplicația-pe-internet)
8. [Instalează aplicația pe telefon](#8-instalează-aplicația-pe-telefon)
9. [Cum se folosește](#9-cum-se-folosește)
10. [Întrebări frecvente și probleme](#10-întrebări-frecvente-și-probleme)
11. [Pentru dezvoltare](#11-pentru-dezvoltare)

---

## 1. Ce îți trebuie

- **Node.js 22** (versiunea „LTS”) — descarcă de pe <https://nodejs.org> și instalează cu opțiunile implicite.
  Verifică: deschide un terminal (pe Windows: *PowerShell*) și scrie `node -v`. Trebuie să apară `v22...` sau mai nou.
- Un cont **GitHub** (gratuit) — <https://github.com> — necesar pentru publicare.
- Un cont **Supabase** (gratuit) — <https://supabase.com>.
- Un cont **Cloudflare** *sau* **Netlify** (gratuit) — pentru publicare.

## 2. Creează contul și proiectul Supabase

1. Intră pe <https://supabase.com> → **Start your project** → autentifică-te (cel mai simplu: cu GitHub).
2. Apasă **New project**.
3. Completează:
   - **Name:** de ex. `print3d`
   - **Database Password:** apasă *Generate a password* și **salveaz-o** undeva sigur.
   - **Region:** `Central EU (Frankfurt)` — cel mai aproape de România.
4. Apasă **Create new project** și așteaptă 1–2 minute.

## 3. Rulează migrațiile SQL

Migrațiile creează tabelele (clienți, comenzi, încasări, setări, istoric), regulile de securitate și spațiul pentru poze.

1. În proiectul Supabase, din meniul din stânga, deschide **SQL Editor**.
2. Apasă **New query** (sau **+**).
3. Deschide pe calculator fișierul `supabase/migrations/0001_schema.sql`, copiază **tot** conținutul și lipește-l în editor.
4. Apasă **Run** (sau `Ctrl + Enter`). Trebuie să apară *Success. No rows returned*.
5. Repetă pașii 2–4 cu fișierul `supabase/migrations/0002_storage.sql`, apoi cu `supabase/migrations/0003_grants.sql`.

> Migrațiile pot fi rulate de mai multe ori fără probleme.

## 4. Creează userul admin

Aplicația e doar pentru tine, deci contul se creează manual, din Supabase:

1. Meniul din stânga → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Scrie emailul și o parolă puternică.
3. Bifează **Auto Confirm User** (altfel trebuie să confirmi emailul).
4. Apasă **Create user**.

**Foarte important — oprește înregistrările publice**, ca nimeni altcineva să nu-și poată face cont:

- **Authentication** → **Sign In / Providers** (în unele versiuni: *Providers* → *Email*) → dezactivează **Allow new users to sign up** → **Save**.

> Chiar dacă cineva ar reuși să-și facă un cont, regulile de securitate (Row Level Security) îl împiedică să vadă datele tale: fiecare utilizator vede doar rândurile lui.

## 5. (Opțional) Încarcă datele de test

Ca să vezi aplicația „plină”: 5 clienți și 15 comenzi în toate statusurile, inclusiv una care ratează deadline-ul.

1. **SQL Editor** → **New query**.
2. Copiază conținutul fișierului `supabase/seed.sql` și apasă **Run**.

> ⚠️ Scriptul **șterge comenzile și clienții existenți** ai adminului înainte să adauge datele de test. Rulează-l doar la început.
> Datele sunt relative la ziua în care rulezi scriptul (deadline-urile se calculează de la „azi”).

Când vrei să pornești „de la zero”, rulează în SQL Editor:

```sql
delete from public.orders; delete from public.clients;
```

## 6. Pornește aplicația pe calculator

1. **Ia cheile Supabase:** în Supabase → **Project Settings** (rotița din stânga jos) → **API** (sau *Data API* / *API Keys*):
   - **Project URL** — arată ca `https://abcdefgh.supabase.co`
   - cheia **anon public** (în interfața nouă se numește **Publishable key**, începe cu `sb_publishable_`)

   > Nu folosi niciodată cheia **service_role** / **secret** în aplicație.

2. Deschide un terminal în folderul proiectului (în VS Code: *Terminal → New Terminal*).
3. Instalează dependențele (o singură dată):

   ```bash
   npm install
   ```

4. Creează fișierul cu chei: copiază `.env.example` și redenumește copia în `.env.local`. Pe Windows, în PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

5. Deschide `.env.local` și completează:

   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=cheia-ta-anon-sau-publishable
   ```

   > `.env.local` este în `.gitignore`, deci **nu ajunge niciodată pe GitHub**.

6. Pornește aplicația:

   ```bash
   npm run dev
   ```

7. Deschide în browser adresa afișată (de obicei <http://localhost:5173>) și autentifică-te cu userul admin.

## 7. Publică aplicația pe internet

### 7.1. Pune codul pe GitHub

1. Pe <https://github.com> → **New repository** → nume `print3d` → alege **Private** → **Create repository**.
2. În terminal, în folderul proiectului (înlocuiește `UTILIZATOR` cu numele tău de GitHub):

   ```bash
   git add .
   git commit -m "Prima versiune"
   git branch -M main
   git remote add origin https://github.com/UTILIZATOR/print3d.git
   git push -u origin main
   ```

   Verifică pe GitHub că fișierul `.env.local` **nu** apare în listă.

### 7.2. Varianta A — Cloudflare Pages (recomandat)

1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → tab-ul **Pages** → **Connect to Git**.
2. Autorizează GitHub și alege repository-ul `print3d` → **Begin setup**.
3. Setări de build:
   - **Framework preset:** `React (Vite)` (sau *None*)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deschide **Environment variables (advanced)** și adaugă:
   - `VITE_SUPABASE_URL` = Project URL-ul tău
   - `VITE_SUPABASE_ANON_KEY` = cheia anon / publishable
   - `NODE_VERSION` = `22`
5. **Save and Deploy**. După 1–2 minute primești o adresă de forma `https://print3d.pages.dev`.

### 7.3. Varianta B — Netlify

1. <https://app.netlify.com> → **Add new site** → **Import an existing project** → **GitHub** → alege `print3d`.
2. Setările de build se citesc automat din `netlify.toml` (`npm run build`, folderul `dist`).
3. **Add environment variables** → adaugă `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`.
4. **Deploy**. Primești o adresă de forma `https://print3d.netlify.app`.

> Ambele servicii au plan gratuit care permite uz comercial. Fiecare `git push` pe `main` republică automat aplicația.
> Dacă schimbi variabilele de mediu, refă deploy-ul (*Retry deployment* / *Trigger deploy*).

### 7.4. Spune-i lui Supabase adresa aplicației

Supabase → **Authentication** → **URL Configuration** → **Site URL** = adresa ta (`https://print3d.pages.dev`) → **Save**.

## 8. Instalează aplicația pe telefon

Deschide adresa publicată pe telefon și autentifică-te, apoi:

- **Android (Chrome):** meniul ⋮ → **Instalează aplicația** (sau *Adaugă pe ecranul de pornire*).
- **iPhone (Safari):** butonul **Partajează** (pătratul cu săgeată) → **Adaugă pe ecranul principal** → **Adaugă**.

Aplicația apare cu iconița ei, se deschide pe tot ecranul și se actualizează singură la fiecare publicare nouă.

## 9. Cum se folosește

### Fluxul unei comenzi

`Nouă → În coadă → Se printează → Finalizată → Livrată` (plus `Anulată`)

- Statusul se schimbă rapid apăsând pe eticheta de status (în tabel, carduri sau panoul de detaliu), sau cu butonul „pasul următor” din panoul de detaliu.
- Când pui o comandă **Se printează**, ora de start se salvează automat; la **Finalizată**, ora de final.
- Dacă imprimanta e deja ocupată, aplicația te întreabă dacă finalizezi comanda curentă.

### Costuri și prețuri

- **Grame** și **ore** sunt **totale pentru toată comanda** (toate bucățile), exact cum le dă slicer-ul (Bambu Studio) pentru toate plăcile.
- **Cost material** = grame ÷ 1000 × preț lei/kg al materialului (din Setări). Se calculează automat în baza de date.
- **Cost curent** = ore × consum (W) ÷ 1000 × preț kWh.
- **Profit estimat** = preț − material − curent.
- **Preț sugerat** = cost real × (1 + adaos %), rotunjit în sus la 5 lei. Butonul **Aplică** îl copiază în câmpul de preț.
- Când schimbi prețul unui filament în Setări, costul se recalculează automat doar pentru comenzile încă neprintate (Nouă / În coadă).

### Încasări

O comandă poate fi plătită în mai multe tranșe. Din panoul de detaliu: **Încasează restul** sau **Altă sumă**.
Statusul de plată (plătit / parțial / neplătit) și suma încasată se calculează automat.

### Coada și estimările

- În pagina **Coadă**, trage de mânerul ⋮⋮ din stânga ca să reordonezi (merge și pe telefon: ține apăsat puțin, apoi trage).
- Estimarea folosește **orele de printare pe zi** și **ora de început** din Setări: de ex. 16 h/zi începând la 08:00 înseamnă că imprimanta lucrează între 08:00 și 24:00. Comenzile din coadă consumă din aceste ore, una după alta; o comandă lungă continuă a doua zi. Zilele libere sunt sărite.
- Comanda care se printează acum se estimează de la ora reală de start.
- **Roșu** = comanda ratează deadline-ul; **portocaliu** = mai puțin de 24 h rezervă; **verde** = în termen.
- **Cardurile de atenționare** de pe Dashboard propun automat o soluție, de ex. „Mută comanda #12 înaintea #9” — cu un singur buton o aplici.

### Export CSV

Pagina **Comenzi** → **CSV comenzi** (exportă comenzile filtrate) sau **CSV încasări**. Fișierele se deschid direct în Excel (separator `;`, diacritice corecte).

## 10. Întrebări frecvente și probleme

**„Lipsesc cheile Supabase”** — fișierul `.env.local` lipsește sau e greșit (local), ori nu ai adăugat variabilele de mediu în Cloudflare/Netlify. După ce le adaugi online, refă deploy-ul.

**„Email sau parolă greșită”** — verifică userul în Supabase → Authentication → Users. Dacă userul nu e confirmat, șterge-l și creează-l din nou bifând *Auto Confirm User*.

**Aplicația nu mai încarcă datele după o pauză lungă** — pe planul gratuit, Supabase **pune proiectul pe pauză după ~7 zile fără activitate**. Intră pe supabase.com, deschide proiectul și apasă **Restore project**. Folosită zilnic, aplicația nu intră în pauză.

**Am uitat parola** — Supabase → Authentication → Users → cele trei puncte de lângă user → *Send password recovery* (sau șterge userul și creează-l din nou; datele rămân doar dacă refolosești **același** user, deci preferă resetarea parolei).

**Backup** — exportă periodic CSV-urile. Pentru backup complet: Supabase → Database → Backups (planul gratuit nu are backup automat descărcabil, deci CSV-ul e cea mai simplă variantă).

**Pozele** — se micșorează automat în telefon/browser (max. 1600 px) înainte de încărcare și se păstrează privat în Supabase Storage (1 GB gratuit).

## 11. Pentru dezvoltare

```bash
npm run dev        # server local
npm run build      # verificare tipuri + build de producție în dist/
npm test           # teste unitare (programare coadă, calcule) + teste de randare a paginilor
npm run test:sql   # rulează migrațiile + seed-ul pe un Postgres local (PGlite) și verifică RLS, triggere, încasări
npm run icons      # regenerează iconițele PWA din public/
```

**Previzualizare fără Supabase:** cu `npm run dev` pornit, deschide <http://localhost:5173/preview.html#/> — aplicația cu date de test, utilă pentru lucrul la design. Rute: `#/comenzi`, `#/coada`, `#/clienti`, `#/statistici`, `#/setari`; `#/comenzi?open=12` deschide panoul comenzii #12, `?new=1` formularul. Această pagină nu intră în build-ul de producție.

### Structura proiectului

```
supabase/
  migrations/0001_schema.sql   tabele, triggere (cost, istoric, încasări), RLS
  migrations/0002_storage.sql  bucket privat pentru poze
  seed.sql                     date de test
src/
  types/db.ts                  tipuri TypeScript pentru toate tabelele
  lib/                         logică fără UI: api, calcule, programarea cozii,
                               avertismente, statistici, formatare, CSV
  hooks/                       autentificare, date (context), ceas
  components/
    ui/                        design system: butoane, câmpuri, carduri, status dot, slide-over…
    layout/                    sidebar desktop + navigare jos pe mobil
    orders/                    formular cu calculator, panou de detaliu, meniu status
    dashboard/                 printer board, warning card, grafice
    queue/                     timeline-ul cozii
    clients/                   formular client
  pages/                       Dashboard, Comenzi, Coadă, Clienți, Client, Statistici, Setări, Login
tailwind.config.ts             design tokens: culori, tipografie, spațieri, animații
```

### Design tokens

Definite central în `tailwind.config.ts`: fundal `#0B0D10`, suprafețe `#14171C`, borduri `#22262D`, text `#FFFFFF` / `#8A9099`.
Culorile de accent sunt **doar semnale de status**: roșu `#FF4747` (critic), portocaliu `#F39444` (atenție), verde `#5EC557` (operațional).
Font: Helvetica Neue, cu Inter ca rezervă (inclus în aplicație, funcționează și offline).

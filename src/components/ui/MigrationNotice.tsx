/** Afișat cât timp migrația 0004 nu a fost rulată în Supabase. */
export function MigrationNotice({ what }: { what: string }) {
  return (
    <div className="card mb-4 flex flex-col gap-2 border-warning/40 px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
        <span className="label text-warning">Un pas în Supabase</span>
      </div>
      <p className="text-sm">
        {what} are nevoie de tabele noi în baza de date. În Supabase → <span className="text-fg">SQL Editor</span> → <span className="text-fg">New query</span>,
        lipește tot conținutul fișierului <code className="text-fg">supabase/migrations/0004_proiectare_stoc_catalog.sql</code> și apasă{' '}
        <span className="text-fg">Run</span>. Apoi reîncarcă pagina.
      </p>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Mail, MapPin, MessageCircle, Pencil, Phone, Plus, Trash2 } from 'lucide-react';
import * as api from '@/lib/api';
import { waLink } from '@/lib/contact';
import { useData } from '@/hooks/useData';
import { amountDue, orderProfit } from '@/lib/calc';
import { clientStats } from '@/lib/stats';
import { dateShort, hours, lei } from '@/lib/format';
import { Card, CardHeader, Kpi } from '@/components/ui/Card';
import { Button, IconButton } from '@/components/ui/Button';
import { Money } from '@/components/ui/Money';
import { PaidSignal } from '@/components/ui/Status';
import { EmptyState, SkeletonCard } from '@/components/ui/Feedback';
import { useFeedback } from '@/components/ui/Toast';
import { ClientFormPanel } from '@/components/clients/ClientForm';
import { StatusMenu } from '@/components/orders/StatusMenu';
import { useOrderPanel } from '@/components/orders/OrderPanelProvider';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { clients, orders, settings, loading, reload } = useData();
  const { openOrder, newOrder } = useOrderPanel();
  const { toast, confirm } = useFeedback();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const client = clients.find((c) => c.id === Number(id));
  if (loading) return <SkeletonCard />;
  if (!client) {
    return (
      <Card>
        <EmptyState title="Clientul nu există" text="Poate a fost șters." action={<Link to="/clienti" className="text-sm underline">Înapoi la clienți</Link>} />
      </Card>
    );
  }

  const list = orders.filter((o) => o.client_id === client.id).sort((a, b) => b.data_comanda.localeCompare(a.data_comanda) || b.id - a.id);
  const st = clientStats([client], orders)[0];
  const profit = list.filter((o) => o.status !== 'anulata').reduce((a, o) => a + orderProfit(settings, o), 0);

  const remove = async () => {
    const ok = await confirm({
      title: `Ștergi clientul „${client.nume}”?`,
      text: list.length ? `Cele ${list.length} comenzi ale lui rămân, dar fără client asociat.` : 'Acțiunea nu poate fi anulată.',
      confirmLabel: 'Șterge clientul',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteClient(client.id);
      toast('Clientul a fost șters.');
      await reload();
      navigate('/clienti');
    } catch (e) {
      toast(api.friendlyError(e), 'error');
    }
  };

  return (
    <>
      <Link to="/clienti" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" /> Clienți
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-light">{client.nume}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {client.telefon && (
              <a href={`tel:${client.telefon.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-fg">
                <Phone className="h-3.5 w-3.5" /> {client.telefon}
              </a>
            )}
            {waLink(client.telefon, '') && (
              <a href={waLink(client.telefon, `Bună ${client.nume.split(' ')[0]}!`)!} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-fg">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-fg">
                <Mail className="h-3.5 w-3.5" /> {client.email}
              </a>
            )}
            {client.oras && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {client.oras}
              </span>
            )}
          </div>
          {client.note && <p className="mt-2 max-w-xl text-sm text-muted">{client.note}</p>}
        </div>
        <div className="flex gap-2">
          <Button icon={<Plus className="h-4 w-4" />} variant="primary" onClick={() => newOrder({ client_id: client.id })}>
            Comandă
          </Button>
          <Button icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(true)}>
            Editează
          </Button>
          <IconButton label="Șterge clientul" onClick={remove} className="hover:text-critical">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <Card className="mb-4">
        <div className="stagger grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">
          <div className="tile p-4">
            <Kpi label="Comenzi" value={st.count} sub={st.last ? `ultima: ${dateShort(st.last)}` : undefined} />
          </div>
          <div className="tile p-4">
            <Kpi label="Total cheltuit" value={<Money value={st.spent} />} />
          </div>
          <div className="tile p-4">
            <Kpi label="De încasat" value={<Money value={st.due} />} signal={st.due > 0 ? 'warning' : undefined} />
          </div>
          <div className="tile p-4">
            <Kpi label="Profit estimat" value={<Money value={profit} />} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Comenzile clientului" right={<span className="num text-xs text-muted">{list.length}</span>} />
        {list.length === 0 ? (
          <EmptyState title="Nicio comandă" action={<Button onClick={() => newOrder({ client_id: client.id })}>Adaugă comandă</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dense num w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data</th>
                  <th>Comandă</th>
                  <th>Status</th>
                  <th className="text-right">Ore</th>
                  <th className="text-right">Preț</th>
                  <th className="text-right">Rest</th>
                  <th>Plată</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => openOrder(o.id)}>
                    <td className="text-muted">{o.id}</td>
                    <td className="text-muted">{dateShort(o.data_comanda)}</td>
                    <td className="max-w-[240px] truncate">{o.titlu}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <StatusMenu order={o} />
                    </td>
                    <td className="text-right">{hours(Number(o.durata_print_ore))}</td>
                    <td className="text-right">{lei(Number(o.pret_vanzare))}</td>
                    <td className="text-right">{lei(amountDue(o))}</td>
                    <td>{o.status !== 'anulata' && <PaidSignal platit={o.platit} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <ClientFormPanel open={editing} client={client} onClose={() => setEditing(false)} />
    </>
  );
}

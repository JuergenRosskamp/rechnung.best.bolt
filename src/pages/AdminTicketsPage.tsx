import { useState, useEffect } from 'react';
import { Search, UserCheck, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface AdminTicket {
  id: string;
  ticket_number: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
  tenant: {
    name: string;
  };
  creator: {
    email: string;
  };
  assigned_to: string | null;
}

export function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const { user } = useAuthStore();

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    avg_response_time: 0,
  });

  useEffect(() => {
    loadAllTickets();
    calculateStats();
  }, []);

  const loadAllTickets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          tenant:tenants(name),
          creator:users!created_by(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('status, created_at, resolved_at');

      if (error) throw error;

      const total = data?.length || 0;
      const open = data?.filter(t => t.status === 'open').length || 0;
      const in_progress = data?.filter(t => t.status === 'in_progress').length || 0;
      const resolved = data?.filter(t => t.status === 'resolved' || t.status === 'closed').length || 0;

      // Calculate average response time (in hours)
      const resolvedTickets = data?.filter(t => t.resolved_at) || [];
      let totalResponseTime = 0;
      resolvedTickets.forEach(t => {
        const created = new Date(t.created_at).getTime();
        const resolved = new Date(t.resolved_at).getTime();
        totalResponseTime += (resolved - created) / (1000 * 60 * 60); // Convert to hours
      });
      const avg_response_time = resolvedTickets.length > 0 ? totalResponseTime / resolvedTickets.length : 0;

      setStats({ total, open, in_progress, resolved, avg_response_time });
    } catch (error) {
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };

      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }
      if (newStatus === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      loadAllTickets();
      calculateStats();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      alert('Fehler beim Aktualisieren des Status');
    }
  };

  const assignToMe = async (ticketId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: user.id,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

      if (error) throw error;

      loadAllTickets();
      calculateStats();
    } catch (error) {
      alert('Fehler beim Zuweisen');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.tenant.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      open: { color: 'bg-blue-100 text-blue-700', label: 'Offen' },
      in_progress: { color: 'bg-yellow-100 text-yellow-700', label: 'In Bearbeitung' },
      waiting: { color: 'bg-orange-100 text-orange-700', label: 'Wartet' },
      resolved: { color: 'bg-green-100 text-green-700', label: 'Gelöst' },
      closed: { color: 'bg-gray-100 dark:bg-secondary-700 text-gray-700 dark:text-secondary-200', label: 'Geschlossen' },
    };

    const badge = badges[status as keyof typeof badges];

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-secondary-50">Admin - Support-Tickets</h1>
            <p className="text-sm text-gray-600 dark:text-secondary-400 mt-1">Ticket-Verwaltung & Support</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-600 dark:text-secondary-400 font-medium">Gesamt</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-secondary-50 mt-1">{stats.total}</p>
          </div>

          <div className="card p-4 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Offen</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{stats.open}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-yellow-50 to-yellow-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">In Arbeit</p>
                <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.in_progress}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Gelöst</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="card p-4">
            <p className="text-sm text-gray-600 dark:text-secondary-400 font-medium">Ø Antwortzeit</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-secondary-50 mt-1">{stats.avg_response_time.toFixed(1)}h</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-secondary-600" />
                  <input
                    type="text"
                    placeholder="Ticket-Nummer, Betreff oder Firma suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-48 px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Status</option>
                <option value="open">Offen</option>
                <option value="in_progress">In Bearbeitung</option>
                <option value="waiting">Wartet</option>
                <option value="resolved">Gelöst</option>
                <option value="closed">Geschlossen</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full md:w-48 px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alle Prioritäten</option>
                <option value="urgent">Dringend</option>
                <option value="high">Hoch</option>
                <option value="medium">Mittel</option>
                <option value="low">Niedrig</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500 dark:text-secondary-500">Lade Tickets...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
              <thead className="bg-gray-50 dark:bg-secondary-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Ticket#
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Firma
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Betreff
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Kategorie
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Priorität
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Erstellt
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-secondary-500 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:bg-secondary-800 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-secondary-50">{ticket.ticket_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-secondary-50">{ticket.tenant.name}</div>
                      <div className="text-xs text-gray-500 dark:text-secondary-500">{ticket.creator.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 dark:text-secondary-50 max-w-md truncate">{ticket.subject}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-secondary-50">
                      {ticket.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        ticket.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 dark:bg-secondary-700 text-gray-700 dark:text-secondary-200'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(ticket.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-secondary-50">
                      {new Date(ticket.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!ticket.assigned_to && ticket.status === 'open' && (
                          <button
                            onClick={() => assignToMe(ticket.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg touch-target"
                            title="Mir zuweisen"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}
                        <select
                          value={ticket.status}
                          onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 dark:border-secondary-600 rounded"
                        >
                          <option value="open">Offen</option>
                          <option value="in_progress">In Bearbeitung</option>
                          <option value="waiting">Wartet</option>
                          <option value="resolved">Gelöst</option>
                          <option value="closed">Geschlossen</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

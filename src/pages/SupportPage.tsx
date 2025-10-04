import { useState, useEffect } from 'react';
import { Plus, Search, MessageCircle, AlertCircle, CheckCircle, Clock, Send } from 'lucide-react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface Ticket {
  id: string;
  ticket_number: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_internal: boolean;
  created_at: string;
  user: {
    email: string;
  };
}

export function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    category: 'question',
    priority: 'medium',
    subject: '',
    description: '',
  });

  useEffect(() => {
    loadTickets();
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('tenant_id', user.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          *,
          user:users(email)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data: ticketNumber } = await supabase.rpc('generate_ticket_number');

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          tenant_id: user.tenant_id,
          created_by: user.id,
          category: formData.category,
          priority: formData.priority,
          subject: formData.subject,
          description: formData.description,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Add initial message
      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticket.id,
          user_id: user.id,
          message: formData.description,
        });

      setShowCreateForm(false);
      setFormData({ category: 'question', priority: 'medium', subject: '', description: '' });
      loadTickets();
      alert('Ticket erfolgreich erstellt!');
    } catch (error) {
      alert('Fehler beim Erstellen des Tickets');
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedTicket || !newMessage.trim()) return;

    try {
      await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: newMessage,
        });

      // Update ticket status if closed
      if (selectedTicket.status === 'closed') {
        await supabase
          .from('support_tickets')
          .update({ status: 'open' })
          .eq('id', selectedTicket.id);
      }

      setNewMessage('');
      loadMessages(selectedTicket.id);
      loadTickets();
    } catch (error) {
      alert('Fehler beim Senden der Nachricht');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      open: { color: 'bg-blue-100 text-blue-700', icon: AlertCircle, label: 'Offen' },
      in_progress: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'In Bearbeitung' },
      waiting: { color: 'bg-orange-100 text-orange-700', icon: Clock, label: 'Wartet' },
      resolved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Gelöst' },
      closed: { color: 'bg-gray-100 dark:bg-secondary-700 text-gray-700 dark:text-secondary-200', icon: CheckCircle, label: 'Geschlossen' },
    };

    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 dark:bg-secondary-700 text-gray-700 dark:text-secondary-200',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };

    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      urgent: 'Dringend',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors]}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-secondary-50">Support</h1>
            <p className="text-sm text-gray-600 dark:text-secondary-400 mt-1">Hilfe & Support-Tickets</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm touch-target"
          >
            <Plus className="h-5 w-5 mr-2" />
            Neues Ticket
          </button>
        </div>

        {/* Create Ticket Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-secondary-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-secondary-50 mb-6">Neues Support-Ticket</h2>
                <form onSubmit={createTicket} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                        Kategorie *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="bug">Bug / Fehler</option>
                        <option value="feature">Feature-Anfrage</option>
                        <option value="question">Frage</option>
                        <option value="billing">Abrechnung</option>
                        <option value="technical">Technisches Problem</option>
                        <option value="other">Sonstiges</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                        Priorität *
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="low">Niedrig</option>
                        <option value="medium">Mittel</option>
                        <option value="high">Hoch</option>
                        <option value="urgent">Dringend</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                      Betreff *
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Kurze Beschreibung des Problems"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-2">
                      Beschreibung *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Detaillierte Beschreibung des Problems..."
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-6 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg hover:bg-gray-50 dark:bg-secondary-800"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Ticket erstellen
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="p-4 border-b border-gray-200 dark:border-secondary-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-secondary-50">Meine Tickets</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-secondary-700 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-secondary-600" />
                    <p className="mt-4 text-gray-500 dark:text-secondary-500">Keine Tickets vorhanden</p>
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:bg-secondary-800 ${
                        selectedTicket?.id === ticket.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-secondary-50">{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-secondary-50 mb-1">{ticket.subject}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-secondary-500">
                        {getPriorityBadge(ticket.priority)}
                        <span>•</span>
                        <span>{new Date(ticket.created_at).toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ticket Details & Messages */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="card h-full flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-secondary-700">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-secondary-500">{selectedTicket.ticket_number}</span>
                        {getStatusBadge(selectedTicket.status)}
                        {getPriorityBadge(selectedTicket.priority)}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-secondary-50">{selectedTicket.subject}</h2>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-secondary-400">{selectedTicket.description}</p>
                </div>

                {/* Messages */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4" style={{ maxHeight: '400px' }}>
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-blue-600">
                          {msg.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-secondary-50">{msg.user?.email || 'User'}</span>
                          <span className="text-xs text-gray-500 dark:text-secondary-500">
                            {new Date(msg.created_at).toLocaleString('de-DE')}
                          </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-secondary-800 rounded-lg p-3">
                          <p className="text-sm text-gray-700 dark:text-secondary-200">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Box */}
                <div className="p-6 border-t border-gray-200 dark:border-secondary-700">
                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-secondary-600 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Nachricht schreiben..."
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-12 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-secondary-600" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-secondary-50">Kein Ticket ausgewählt</h3>
                <p className="mt-2 text-gray-500 dark:text-secondary-500">Wählen Sie ein Ticket aus oder erstellen Sie ein neues.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

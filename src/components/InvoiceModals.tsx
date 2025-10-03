import { useState } from 'react';
import { X, Mail, FileText, Send, Download } from 'lucide-react';
import { format } from 'date-fns';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string, format: 'standard' | 'zugferd') => void;
  customerEmail?: string;
  invoiceNumber: string;
}

export function SendEmailModal({ isOpen, onClose, onSend, customerEmail, invoiceNumber }: SendEmailModalProps) {
  const [email, setEmail] = useState(customerEmail || '');
  const [pdfFormat, setPdfFormat] = useState<'standard' | 'zugferd'>('standard');
  const [subject, setSubject] = useState(`Rechnung ${invoiceNumber}`);
  const [message, setMessage] = useState(`Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die Rechnung ${invoiceNumber}.\n\nMit freundlichen Grüßen`);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(email, pdfFormat);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/50 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 flex items-center justify-between p-6 bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-50">Rechnung per E-Mail senden</h2>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">Rechnung {invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="label">Empfänger E-Mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kunde@beispiel.de"
              className="input"
            />
          </div>

          <div>
            <label className="label">PDF-Format</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                pdfFormat === 'standard' ? 'border-primary-600 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="standard"
                  checked={pdfFormat === 'standard'}
                  onChange={(e) => setPdfFormat(e.target.value as 'standard')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-secondary-900">Standard PDF</div>
                  <div className="text-xs text-secondary-600">Klassische PDF-Rechnung</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                pdfFormat === 'zugferd' ? 'border-primary-600 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'
              }`}>
                <input
                  type="radio"
                  name="format"
                  value="zugferd"
                  checked={pdfFormat === 'zugferd'}
                  onChange={(e) => setPdfFormat(e.target.value as 'zugferd')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-secondary-900">ZUGFeRD</div>
                  <div className="text-xs text-secondary-600">Hybrid PDF/A-3 + XML</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="label">Betreff</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Nachricht</label>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
            <button type="submit" className="btn-primary">
              <Send className="w-4 h-4" />
              E-Mail senden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SendXRechnungModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (email: string, leitwegId: string, processType: string) => void;
  customerEmail?: string;
  invoiceNumber: string;
}

export function SendXRechnungModal({ isOpen, onClose, onSend, customerEmail }: SendXRechnungModalProps) {
  const [email, setEmail] = useState(customerEmail || '');
  const [leitwegId, setLeitwegId] = useState('');
  const [processType, setProcessType] = useState('B2B');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(email, leitwegId, processType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/50 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-lg animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary-900">XRechnung per E-Mail</h2>
              <p className="text-sm text-secondary-600">EN 16931 konformes XML</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="label">Empfänger E-Mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kunde@beispiel.de"
              className="input"
            />
          </div>

          <div>
            <label className="label">Leitweg-ID</label>
            <input
              type="text"
              value={leitwegId}
              onChange={(e) => setLeitwegId(e.target.value)}
              placeholder="z.B. 991-12345-67"
              className="input"
            />
            <p className="text-xs text-secondary-500 mt-1">
              Für öffentliche Auftraggeber (optional)
            </p>
          </div>

          <div>
            <label className="label">Geschäftsprozess</label>
            <select
              value={processType}
              onChange={(e) => setProcessType(e.target.value)}
              className="input"
            >
              <option value="B2B">B2B - Business to Business</option>
              <option value="B2G">B2G - Business to Government</option>
              <option value="B2C">B2C - Business to Consumer</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
            <button type="submit" className="btn-primary">
              <Send className="w-4 h-4" />
              XRechnung senden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ViewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

export function ViewInvoiceModal({ isOpen, onClose, invoice }: ViewInvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  const getStatusBadge = (status: string) => {
    const badges = {
      DRAFT: 'badge-secondary',
      OPEN: 'badge-warning',
      PAID: 'badge-success',
      OVERDUE: 'badge-error',
      CANCELLED: 'badge-error',
    };
    return badges[status as keyof typeof badges] || 'badge-secondary';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      DRAFT: 'Entwurf',
      OPEN: 'Offen',
      PAID: 'Bezahlt',
      OVERDUE: 'Überfällig',
      CANCELLED: 'Storniert',
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/50 backdrop-blur-sm animate-fade-in">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 flex items-center justify-between p-6 bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-50">Rechnung {invoice.invoice_number}</h2>
              <span className={`badge ${getStatusBadge(invoice.status)} mt-1`}>
                {getStatusLabel(invoice.status)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Kundendaten */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider">Kunde</h3>
              <div className="p-4 bg-secondary-50 rounded-xl">
                <p className="font-medium text-secondary-900">{invoice.customer_snapshot?.company_name || 'N/A'}</p>
                {invoice.customer_snapshot?.first_name && (
                  <p className="text-sm text-secondary-600">
                    {invoice.customer_snapshot.first_name} {invoice.customer_snapshot.last_name}
                  </p>
                )}
                {invoice.customer_snapshot?.email && (
                  <p className="text-sm text-secondary-600 mt-2">{invoice.customer_snapshot.email}</p>
                )}
                {invoice.customer_snapshot?.phone && (
                  <p className="text-sm text-secondary-600">{invoice.customer_snapshot.phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider">Rechnungsdetails</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-secondary-200">
                  <span className="text-sm text-secondary-600">Rechnungsdatum</span>
                  <span className="text-sm font-medium text-secondary-900">
                    {format(new Date(invoice.invoice_date), 'dd.MM.yyyy')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-200">
                  <span className="text-sm text-secondary-600">Fälligkeitsdatum</span>
                  <span className="text-sm font-medium text-secondary-900">
                    {format(new Date(invoice.due_date), 'dd.MM.yyyy')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-secondary-200">
                  <span className="text-sm text-secondary-600">Zahlungsziel</span>
                  <span className="text-sm font-medium text-secondary-900">{invoice.payment_terms || 'Sofort'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Positionen */}
          <div>
            <h3 className="text-sm font-semibold text-secondary-900 uppercase tracking-wider mb-4">Positionen</h3>
            <div className="overflow-x-auto">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Beschreibung</th>
                    <th className="text-right">Menge</th>
                    <th className="text-right">Einzelpreis</th>
                    <th className="text-right">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td>
                        <div className="font-medium text-secondary-900">{item.description}</div>
                        {item.notes && (
                          <div className="text-sm text-secondary-600">{item.notes}</div>
                        )}
                      </td>
                      <td className="text-right">{item.quantity} {item.unit}</td>
                      <td className="text-right">{item.unit_price.toFixed(2)} €</td>
                      <td className="text-right font-medium">{item.total_price.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summen */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between py-2">
                <span className="text-secondary-600">Zwischensumme</span>
                <span className="font-medium">{invoice.subtotal?.toFixed(2) || '0.00'} €</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-secondary-600">MwSt ({invoice.tax_rate || 19}%)</span>
                <span className="font-medium">{invoice.tax_amount?.toFixed(2) || '0.00'} €</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between py-2 text-success-600">
                  <span>Rabatt</span>
                  <span className="font-medium">-{invoice.discount_amount.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-secondary-900">
                <span className="text-lg font-bold text-secondary-900">Gesamtbetrag</span>
                <span className="text-lg font-bold text-secondary-900">{invoice.total_amount?.toFixed(2) || '0.00'} €</span>
              </div>
            </div>
          </div>

          {/* Notizen */}
          {invoice.notes && (
            <div className="p-4 bg-secondary-50 rounded-xl">
              <h4 className="text-sm font-semibold text-secondary-900 mb-2">Notizen</h4>
              <p className="text-sm text-secondary-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 p-6 bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700">
          <button onClick={onClose} className="btn-secondary">
            Schließen
          </button>
          <button className="btn-primary">
            <Download className="w-4 h-4" />
            PDF herunterladen
          </button>
        </div>
      </div>
    </div>
  );
}

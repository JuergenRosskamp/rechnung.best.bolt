export interface User {
  id: string;
  email: string;
  tenant_id: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tenant {
  id: string;
  name: string;
  company_name?: string;
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  vat_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_bic?: string;
  bank_iban?: string;
  bank_notes?: string;
  logo_url?: string;
  settings?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  status: string;
  plan_type?: string;
  plan?: string;
  current_period_end?: string;
  trial_ends_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  customer_number: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  vat_id?: string;
  payment_terms_days?: number;
  discount_percentage?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Article {
  id: string;
  tenant_id: string;
  article_number: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  unit_price: number;
  cost_price?: number;
  vat_rate: number;
  is_service: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  vat_amount: number;
  total: number;
  payment_terms_days?: number;
  discount_percentage?: number;
  discount_amount?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  article_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total: number;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface Vehicle {
  id: string;
  tenant_id: string;
  license_plate: string;
  brand: string;
  model: string;
  year?: number;
  vin?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Delivery {
  id: string;
  tenant_id: string;
  vehicle_id?: string;
  delivery_date: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DeliveryLocation {
  id: string;
  tenant_id: string;
  name: string;
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  city?: string;
  country?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CashbookEntry {
  id: string;
  tenant_id: string;
  entry_date: string;
  document_type: 'income' | 'expense';
  category_id: string;
  description: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  reference?: string;
  receipt_id?: string;
  is_cancelled: boolean;
  cancellation_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CashbookCategory {
  id: string;
  tenant_id: string;
  name: string;
  type: 'income' | 'expense';
  created_at?: string;
  updated_at?: string;
}

export interface Receipt {
  id: string;
  tenant_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface Quote {
  id: string;
  tenant_id: string;
  customer_id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  subtotal: number;
  vat_amount: number;
  total: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceLayout {
  id: string;
  tenant_id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

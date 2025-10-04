export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: 'admin' | 'office' | 'driver';
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  company_name: string;
  address_line1: string | null;
  address_line2: string | null;
  zip_code: string | null;
  city: string | null;
  country: string;
  tax_id: string | null;
  vat_id: string | null;
  logo_url: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  iban: string | null;
  bic: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_type: 'basic_kasse' | 'basic_invoice' | 'rechnung.best';
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused';
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  customer_number: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  zip_code: string | null;
  city: string | null;
  country: string;
  tax_id: string | null;
  vat_id: string | null;
  notes: string | null;
  payment_terms_days: number;
  early_payment_discount_percent: number;
  early_payment_discount_days: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  tenant_id: string;
  article_number: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  tax_rate: number;
  category: string | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryLocation {
  id: string;
  customer_id: string;
  location_name: string;
  address_line1: string;
  address_line2: string | null;
  zip_code: string;
  city: string;
  country: string;
  contact_person: string | null;
  contact_phone: string | null;
  delivery_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryPosition {
  id: string;
  tenant_id: string;
  customer_id: string;
  article_id: string;
  delivery_location_id: string | null;
  delivery_quantity: number;
  unit_price: number;
  delivery_status: 'DELIVERED' | 'PENDING' | 'CANCELLED';
  delivery_timestamp: string;
  vehicle_id: string | null;
  notes: string | null;
  billed: boolean;
  invoice_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

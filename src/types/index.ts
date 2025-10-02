export type UserRole = 'admin' | 'office' | 'accountant' | 'driver' | 'foreman' | 'filialleitung' | 'readonly' | 'custom';

export type SubscriptionPlan = 'basic_kasse' | 'basic_invoice' | 'rechnung.best';

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'paused';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  company_name: string;
  address_line1?: string;
  address_line2?: string;
  zip_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  vat_id?: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_holder?: string;
  iban?: string;
  bic?: string;
  bank_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryLocation {
  id: string;
  tenant_id: string;
  customer_id: string;
  location_number: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  zip_code: string;
  city: string;
  country: string;
  delivery_instructions?: string;
  access_notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface DeliveryPosition {
  id: string;
  tenant_id: string;
  customer_id: string;
  article_id: string;
  delivery_location_id?: string;

  delivery_note_number: string;
  delivery_timestamp: string;
  delivery_quantity: number;
  delivery_address?: string;
  delivery_status: DeliveryStatus;

  unit_price: number;
  discount_percentage: number;
  discounted_price: number;
  total_price: number;

  customer_billing_done: boolean;
  invoice_id?: string;

  vehicle_id?: string;
  driver_name?: string;

  unit: string;
  description?: string;
  notes?: string;

  customer_snapshot?: Record<string, any>;
  article_snapshot?: Record<string, any>;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Article {
  id: string;
  tenant_id: string;
  article_number: string;
  description: string;
  unit: string;
  unit_price: number;
  base_price?: number;
  discount_percentage?: number;
  discount_enabled?: boolean;
  discount_start_date?: string;
  discount_end_date?: string;
  category?: string;
  vat_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
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
  address?: string;
  city?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  vat_id?: string;
  separate_construction_billing?: boolean;
  default_payment_days?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PendingInvoiceGroup {
  tenant_id: string;
  customer_id: string;
  customer_name: string;
  separate_construction_billing: boolean;
  construction_site_id?: string;
  construction_site_name?: string;
  position_count: number;
  total_net: number;
  total_gross: number;
  earliest_delivery: string;
  latest_delivery: string;
}

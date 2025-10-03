import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  tenant_id: string;
  role?: string;
}

export interface Tenant {
  id: string;
  name: string;
  settings?: any;
}

export interface Subscription {
  id: string;
  status: string;
  plan?: string;
  current_period_end?: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  subscription: Subscription | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  subscription: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setTenant: (tenant) => set({ tenant }),
  setSubscription: (subscription) => set({ subscription }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, tenant: null, subscription: null, isAuthenticated: false }),
}));

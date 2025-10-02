import { supabase } from './supabase';
import type { User, Tenant, Subscription } from '../types';

export interface RegisterData {
  email: string;
  password: string;
  companyName: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async register(data: RegisterData) {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // 2. Create tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        company_name: data.companyName,
      })
      .select()
      .single();

    if (tenantError) {
      // Cleanup auth user if tenant creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw tenantError;
    }

    // 3. Create user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id: tenantData.id,
        email: data.email,
        role: 'admin',
        first_name: data.firstName,
        last_name: data.lastName,
      })
      .select()
      .single();

    if (userError) throw userError;

    // 4. Create subscription (14-day trial, rechnung.best plan)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: tenantData.id,
        plan_type: 'rechnung.best',
        status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    return {
      user: userData as User,
      tenant: tenantData as Tenant,
      subscription: subscriptionData as Subscription,
    };
  },

  async login(data: LoginData) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Login failed');

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (userError) throw userError;
    if (!userData) throw new Error('User profile not found');

    // Get tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userData.tenant_id)
      .maybeSingle();

    if (tenantError) throw tenantError;
    if (!tenantData) throw new Error('Tenant not found');

    // Get subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;
    if (!subscriptionData) throw new Error('Subscription not found');

    return {
      user: userData as User,
      tenant: tenantData as Tenant,
      subscription: subscriptionData as Subscription,
    };
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) return null;

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userError) throw userError;
    if (!userData) return null;

    // Get tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userData.tenant_id)
      .maybeSingle();

    if (tenantError) throw tenantError;
    if (!tenantData) return null;

    // Get subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;
    if (!subscriptionData) return null;

    return {
      user: userData as User,
      tenant: tenantData as Tenant,
      subscription: subscriptionData as Subscription,
    };
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },
};

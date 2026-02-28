import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description: string | null;
  image_url: string | null;
  features: Array<{ title: string; description: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PricingTier = {
  id: string;
  product_id: string;
  duration_type: 'day' | 'week' | 'month' | 'lifetime';
  price: number;
  stock: number;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  product_id: string;
  pricing_tier_id: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  expires_at: string | null;
};

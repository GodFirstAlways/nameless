/*
  # Create Products and Pricing Schema

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `name` (text) - Product name (e.g., "Void Spoofer")
      - `slug` (text, unique) - URL-friendly name
      - `description` (text) - Short description
      - `long_description` (text) - Detailed description
      - `image_url` (text) - Product image
      - `features` (jsonb) - Array of feature objects
      - `is_active` (boolean) - Is product available for purchase
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `pricing_tiers`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `duration_type` (enum: day, week, month, lifetime)
      - `price` (decimal) - Price in USD
      - `stock` (integer) - Available quantity (-1 for unlimited)
      - `created_at` (timestamp)

    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `product_id` (uuid, foreign key)
      - `pricing_tier_id` (uuid, foreign key)
      - `quantity` (integer)
      - `total_price` (decimal)
      - `status` (enum: pending, completed, cancelled)
      - `created_at` (timestamp)
      - `expires_at` (timestamp) - When access expires (for time-limited tiers)

  2. Security
    - Enable RLS on all tables
    - Products readable by all authenticated users
    - Orders readable/writable only by owner
    - Pricing tiers readable by all
*/

CREATE TYPE duration_type AS ENUM ('day', 'week', 'month', 'lifetime');
CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  long_description text,
  image_url text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  duration_type duration_type NOT NULL,
  price decimal(10, 2) NOT NULL,
  stock integer DEFAULT -1,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  pricing_tier_id uuid NOT NULL REFERENCES pricing_tiers(id),
  quantity integer DEFAULT 1,
  total_price decimal(10, 2) NOT NULL,
  status order_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are readable by everyone"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Pricing tiers are readable by everyone"
  ON pricing_tiers FOR SELECT
  USING (true);

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_pricing_tiers_product_id ON pricing_tiers(product_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);
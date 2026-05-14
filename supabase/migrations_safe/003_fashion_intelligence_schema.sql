
-- Task 2: Personalization Engine
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  style_tags TEXT[] DEFAULT '{}', -- ['minimalist', 'streetwear', 'vintage']
  favorite_colors TEXT[] DEFAULT '{}',
  disliked_categories TEXT[] DEFAULT '{}',
  price_preference TEXT DEFAULT 'mid-range',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 5: Wardrobe System
CREATE TABLE IF NOT EXISTS user_wardrobe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT, -- References external products or clothing_assets
  category TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}', -- { "color": "blue", "material": "denim" }
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  product_ids TEXT[] DEFAULT '{}',
  category_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 4: Trend Engine
CREATE TABLE IF NOT EXISTS fashion_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season TEXT, -- 'Summer 2024'
  trend_name TEXT,
  description TEXT,
  style_vectors JSONB, -- For similarity matching
  relevance_score FLOAT DEFAULT 1.0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task 1: Recommendation Memory
CREATE TABLE IF NOT EXISTS recommendation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommended_product_ids TEXT[],
  context TEXT, -- 'daily_outfit', 'seasonal_refresh'
  feedback_score INTEGER, -- 1-5
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

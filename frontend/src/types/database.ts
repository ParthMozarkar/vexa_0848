/**
 * Supabase database row types (hand-maintained).
 * Keep aligned with `supabase/migrations_safe/*.sql` and route inserts/selects.
 */

export interface UserRow {
  id: string;
  email: string;
  height: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  inseam: number | null;
  shoulder_width: number | null;
  avatar_url: string | null;
  face_texture_url: string | null;
  marketplace_id: string | null;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  marketplace_id: string;
  marketplace_name: string;
  key_hash: string;
  webhook_url: string | null;
  status: 'active' | 'revoked';
  created_at: string;
  last_used_at: string | null;
  call_count: number;
  monthly_limit: number | null;
}

export interface ClothingAssetRow {
  id: string;
  product_id: string;
  product_image_url: string;
  category: string | null;
  meshy_task_id: string | null;
  glb_url: string | null;
  status: 'pending' | 'ready' | 'failed';
  created_at: string;
}

export interface UsageLogRow {
  id: string;
  api_key_id: string | null;
  user_id?: string | null;
  endpoint: string;
  /** HTTP-style status (e.g. 200) — used by middleware + analytics */
  status: number | null;
  response_time_ms: number | null;
  timestamp: string;
  /** Legacy column name from early DDL */
  status_code?: number | null;
  product_id?: string | null;
  created_at?: string | null;
}

export interface TryOnResultRow {
  id: string;
  user_id: string;
  product_id: string;
  product_image_url: string | null;
  user_photo_url?: string | null;
  garment_url?: string | null;
  result_url: string;
  fit_label: string | null;
  recommended_size: string | null;
  status: string;
  created_at: string;
}

export interface SizeChartRow {
  id: string;
  product_id: string;
  marketplace: string;
  size: string;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  length: number | null;
  shoulder_width: number | null;
  created_at: string;
}

/** IP-based free-tier limits for try-on / design (see `ip_usage_limits` table). */
export interface IpUsageLimitRow {
  id: string;
  ip_address: string;
  usage_type: 'tryon' | 'design';
  count: number;
  last_reset: string;
}

export interface VideoJobRow {
  id: string;
  user_id: string;
  product_id: string;
  input_video_url: string;
  product_image_url: string;
  status: 'processing' | 'completed' | 'failed';
  progress_percent: number | null;
  result_video_url: string | null;
  error_message: string | null;
  created_at: string;
}

export interface BookingRow {
  id: string;
  name: string;
  email: string;
  company: string;
  platform: string | null;
  message: string | null;
  slot_date: string | null;
  slot_time: string | null;
  company_size: string | null;
  created_at?: string;
}

// ─── Multi-Tenant / Organizations ────────────────────────────────────────────

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  owner_id: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface OrgMemberRow {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface TenantQuotaRow {
  id: string;
  org_id: string;
  daily_ai_limit: number;
  monthly_ai_limit: number;
  daily_used: number;
  monthly_used: number;
  reset_daily_at: string;
  reset_monthly_at: string;
  updated_at: string;
}

export interface UsageEventRow {
  id: string;
  org_id: string | null;
  user_id: string | null;
  provider: string;
  endpoint: string;
  unit: string;
  quantity: number;
  cost_usd: number;
  duration_ms: number;
  status: 'success' | 'failed';
  timestamp: string;
  stripe_meter_id: string | null;
  idempotency_key: string | null;
}

export interface Database {
  public: {
    PostgrestVersion: '12';
    Tables: {
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<UserRow, 'id'>>;
        Relationships: [];
      };
      api_keys: {
        Row: ApiKeyRow;
        Insert: Omit<ApiKeyRow, 'id' | 'created_at' | 'last_used_at' | 'call_count'> & {
          id?: string;
          created_at?: string;
          last_used_at?: string | null;
          call_count?: number;
          monthly_limit?: number | null;
        };
        Update: Partial<Omit<ApiKeyRow, 'id'>>;
        Relationships: [];
      };
      clothing_assets: {
        Row: ClothingAssetRow;
        Insert: Omit<ClothingAssetRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<ClothingAssetRow, 'id'>>;
        Relationships: [];
      };
      usage_logs: {
        Row: UsageLogRow;
        Insert: Omit<UsageLogRow, 'id'> & { id?: string };
        Update: Partial<Omit<UsageLogRow, 'id'>>;
        Relationships: [];
      };
      tryon_results: {
        Row: TryOnResultRow;
        Insert: Omit<TryOnResultRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<TryOnResultRow, 'id'>>;
        Relationships: [];
      };
      size_charts: {
        Row: SizeChartRow;
        Insert: Omit<SizeChartRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<SizeChartRow, 'id'>>;
        Relationships: [];
      };
      ip_usage_limits: {
        Row: IpUsageLimitRow;
        Insert: Omit<IpUsageLimitRow, 'id'>;
        Update: Partial<Omit<IpUsageLimitRow, 'id'>>;
        Relationships: [];
      };
      video_jobs: {
        Row: VideoJobRow;
        Insert: Omit<VideoJobRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<VideoJobRow, 'id'>>;
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: Omit<BookingRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<BookingRow, 'id'>>;
        Relationships: [];
      };
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: never[] }>;
    Functions: {
      increment_ip_usage: { Args: { p_ip: string; p_type: string }; Returns: undefined };
    };
  };
}

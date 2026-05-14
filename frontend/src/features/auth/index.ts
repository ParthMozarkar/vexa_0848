// features/auth/index.ts
// Barrel re-exports for the auth feature.
// Zero file moves — consumers can use @/features/auth without breaking existing imports.

// Supabase client (named export)
export { supabase } from '@/lib/supabase';

// Hook + types
export { useUser } from '@/hooks/useUser';
export type { UserWithMeasurements } from '@/hooks/useUser';

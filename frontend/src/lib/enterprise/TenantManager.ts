
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export class TenantManager {
  private static supabase = createServerSupabaseClient();

  static async getOrgForUser(userId: string) {
    const { data } = await this.supabase
      .from('org_members')
      .select('organizations(*)')
      .eq('user_id', userId)
      .single();
    
    return data?.organizations;
  }

  static async validatePermission(userId: string, orgId: string, permission: string): Promise<boolean> {
    const { data: member } = await this.supabase
      .from('org_members')
      .select('role')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (!member) return false;

    // Check role_permissions table
    const { data: hasPerm } = await this.supabase
      .from('role_permissions')
      .select('id')
      .eq('role', member.role)
      .innerJoin('permissions', 'permission_id', 'id')
      .eq('name', permission)
      .maybeSingle();

    return !!hasPerm;
  }

  static async updateBranding(orgId: string, branding: any) {
    return await this.supabase
      .from('organizations')
      .update({ branding_config: branding })
      .eq('id', orgId);
  }
}

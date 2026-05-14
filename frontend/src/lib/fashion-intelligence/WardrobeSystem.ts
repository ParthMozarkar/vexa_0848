
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { FashionItem } from './types';

export class WardrobeSystem {
  private static supabase = createServerSupabaseClient();

  static async addToWardrobe(userId: string, item: Partial<FashionItem>) {
    return await this.supabase.from('user_wardrobe').insert({
      user_id: userId,
      product_id: item.id,
      category: item.category,
      image_url: item.imageUrl,
      metadata: { color: item.color, tags: item.tags }
    });
  }

  static async getWardrobe(userId: string): Promise<FashionItem[]> {
    const { data } = await this.supabase
      .from('user_wardrobe')
      .select('*')
      .eq('user_id', userId);
    
    return (data || []).map(row => ({
      id: row.product_id || row.id,
      name: `Wardrobe Item ${row.id.slice(0,4)}`,
      category: row.category || 'unknown',
      imageUrl: row.image_url || '',
      color: row.metadata?.color || '',
      tags: row.metadata?.tags || []
    }));
  }

  static async saveOutfit(userId: string, name: string, items: FashionItem[]) {
    return await this.supabase.from('saved_outfits').insert({
      user_id: userId,
      name,
      product_ids: items.map(i => i.id),
      category_tags: Array.from(new Set(items.map(i => i.category)))
    });
  }

  static async getAIWardrobeCombinations(userId: string): Promise<any[]> {
    const items = await this.getWardrobe(userId);
    console.log(`[Wardrobe] Generating combinations for ${items.length} items`);
    
    // In a real implementation, this would use a combinatorial styling algorithm
    // to find valid Outfit (Top + Bottom + Outerwear) from the user's own items.
    return [];
  }
}

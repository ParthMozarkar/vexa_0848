
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { StyleProfile } from './types';

export class PersonalizationEngine {
  private static supabase = createServerSupabaseClient();

  static async getUserProfile(userId: string): Promise<StyleProfile | null> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      tags: data.style_tags || [],
      colors: data.favorite_colors || [],
      dislikedCategories: data.disliked_categories || [],
      priceRange: (data.price_preference as any) || 'mid',
    };
  }

  static async updatePreferences(userId: string, interaction: { itemId: string; type: 'view' | 'like' | 'dislike' }) {
    console.log(`[Personalization] Learning from ${interaction.type} on item ${interaction.itemId}`);
    
    // In a real implementation, this would fetch the item's tags 
    // and update the user_preferences table using a weighted average or reinforcement learning logic.
    const { data: profile } = await this.supabase
      .from('user_preferences')
      .select('style_tags')
      .eq('user_id', userId)
      .single();

    if (profile) {
      // Logic to append/weight tags based on interaction
      // This is a simplified placeholder
      const newTags = Array.from(new Set([...(profile.style_tags || []), 'modern', interaction.type === 'like' ? 'trending' : 'basic']));
      
      await this.supabase
        .from('user_preferences')
        .update({ style_tags: newTags, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
  }

  static async getRecommendationHistory(userId: string) {
    return await this.supabase
      .from('recommendation_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
  }
}

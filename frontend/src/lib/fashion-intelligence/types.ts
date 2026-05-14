
export type StyleProfile = {
  tags: string[];
  colors: string[];
  dislikedCategories: string[];
  priceRange: 'budget' | 'mid' | 'premium' | 'luxury';
};

export type RecommendationContext = {
  weather?: string;
  occasion?: string;
  bodyType?: string;
  season?: string;
};

export interface FashionItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  tags: string[];
  color: string;
}

export interface StylingRecommendation {
  outfitId: string;
  items: FashionItem[];
  stylistReasoning: string;
  matchScore: number;
}

export interface TrendData {
  id: string;
  name: string;
  description: string;
  growthRate: number;
  featuredItems: string[];
}

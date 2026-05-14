
import { AIProvider } from './types';
import { TNBProvider } from '../providers/tnbProvider';

// Unified Registry using class instances
export const REGISTERED_PROVIDERS: AIProvider[] = [
  new TNBProvider('tnb-vto', 'TheNewBlack VTO', 'tryon', 0.05, 8000, 0.7),
  new TNBProvider('tnb-video', 'TheNewBlack Video', 'video-gen', 0.15, 15000, 1.0),
  
  // Scoring and Design would go here as class instances too
];

export function getProvidersByType(type: AIProvider['type']): AIProvider[] {
  return REGISTERED_PROVIDERS.filter(p => p.type === type && p.enabled);
}

import type { AIProvider, ProviderCapability } from './types';
import { TNBProvider } from './tnbProvider';
import { OpenAIProvider } from './openaiProvider';

// Capability → ordered list of providers (primary first, fallbacks after)
const REGISTRY = new Map<ProviderCapability, AIProvider[]>();

export function registerProvider(
  capability: ProviderCapability,
  provider: AIProvider,
  position: 'primary' | 'fallback' = 'primary',
): void {
  const list = REGISTRY.get(capability) ?? [];
  if (position === 'primary') list.unshift(provider);
  else list.push(provider);
  REGISTRY.set(capability, list);
}

export function getProviders(capability: ProviderCapability): AIProvider[] {
  return REGISTRY.get(capability) ?? [];
}

export function getPrimaryProvider(capability: ProviderCapability): AIProvider | null {
  return getProviders(capability)[0] ?? null;
}

// Initialize default providers
export function initializeRegistry(): void {
  registerProvider('tryon', new TNBProvider('tnb-vto', 'TheNewBlack VTO', 'tryon', 0.05, 8000, 0.7));
  registerProvider('tryon-video', new TNBProvider('tnb-video', 'TheNewBlack Video', 'video-gen', 0.15, 15000, 1.0));
  registerProvider('design', new OpenAIProvider());
  registerProvider('trends', new OpenAIProvider());
  // model-gen registration removed as it was BlackBox based
}

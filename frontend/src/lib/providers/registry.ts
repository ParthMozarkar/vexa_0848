import type { AIProvider, ProviderCapability } from './types';
import { TNBProvider } from './tnbProvider';
import { OpenAIProvider } from './openaiProvider';
import { MeshyProvider } from './meshyProvider';

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
  registerProvider('tryon', new TNBProvider());
  registerProvider('tryon-video', new TNBProvider());
  registerProvider('design', new OpenAIProvider());
  registerProvider('trends', new OpenAIProvider());
  // model-gen registration removed as it was BlackBox based
}

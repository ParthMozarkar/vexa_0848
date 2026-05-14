
import { AIProvider } from './types';

export const REGISTERED_PROVIDERS: AIProvider[] = [
  {
    id: 'tnb-vto',
    name: 'TheNewBlack VTO',
    type: 'tryon',
    costPerCall: 0.05,
    expectedLatencyMs: 8000,
    weight: 0.7,
    enabled: true,
  },
  {
    id: 'blackbox-vto',
    name: 'Blackbox AI',
    type: 'tryon',
    costPerCall: 0.12,
    expectedLatencyMs: 12000,
    weight: 0.3,
    enabled: true,
  },
  {
    id: 'tnb-video',
    name: 'TheNewBlack Video',
    type: 'video-gen',
    costPerCall: 0.15,
    expectedLatencyMs: 15000,
    weight: 1.0,
    enabled: true,
  },
  {
    id: 'meshy-3d',
    name: 'Meshy 3D',
    type: '3d-gen',
    costPerCall: 0.20,
    expectedLatencyMs: 45000,
    weight: 1.0,
    enabled: true,
  },
  {
    id: 'openai-gpt4o',
    name: 'OpenAI GPT-4o',
    type: 'scoring',
    costPerCall: 0.01,
    expectedLatencyMs: 2000,
    weight: 1.0,
    enabled: true,
  }
];

export function getProvidersByType(type: AIProvider['type']): AIProvider[] {
  return REGISTERED_PROVIDERS.filter(p => p.type === type && p.enabled);
}

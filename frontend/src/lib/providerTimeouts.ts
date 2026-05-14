export const PROVIDER_TIMEOUTS: Record<string, number> = {
  TNB: parseInt(process.env.TNB_TIMEOUT_MS ?? '120000'),
  OpenAI: parseInt(process.env.OPENAI_TIMEOUT_MS ?? '60000'),
  BlackBox: parseInt(process.env.BLACKBOX_TIMEOUT_MS ?? '120000'),
};

export function getProviderTimeout(providerName: string): number {
  return PROVIDER_TIMEOUTS[providerName] ?? 60_000;
}

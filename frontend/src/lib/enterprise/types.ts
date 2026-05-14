
export interface TenantBranding {
  primaryColor: string;
  logoUrl: string;
  fontFamily: string;
  theme: 'light' | 'dark' | 'glass';
  customCss?: string;
}

export interface EnterpriseOrg {
  id: string;
  name: string;
  slug: string;
  branding: TenantBranding;
  plan: 'free' | 'pro' | 'enterprise';
}

export interface SDKConfig {
  apiKey: string;
  tenantId: string;
  containerId: string;
  features: {
    videoTryOn: boolean;
    sizeAdvisor: boolean;
    socialSharing: boolean;
  };
}

export interface ConversionMetrics {
  totalTryOns: number;
  conversionRate: number;
  revenueLift: number;
  topPerformingProducts: Array<{ id: string; count: number }>;
}

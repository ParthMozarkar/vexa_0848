
/**
 * VEXA Embeddable SDK (Enterprise)
 * This script is injected into client storefronts to initialize the VEXA experience.
 */

import { SDKConfig, TenantBranding } from './types';

export class VexaSDK {
  private config: SDKConfig;
  private branding: TenantBranding | null = null;

  constructor(config: SDKConfig) {
    this.config = config;
    console.log(`[VEXA SDK] Initialized for tenant: ${config.tenantId}`);
  }

  async init() {
    // 1. Fetch Tenant Branding
    await this.loadBranding();
    
    // 2. Inject Styles
    this.injectStyles();
    
    // 3. Mount UI
    this.mountExperience();
  }

  private async loadBranding() {
    // In production, this fetches from /api/enterprise/branding
    this.branding = {
      primaryColor: '#4A6741',
      logoUrl: '',
      fontFamily: 'Outfit, sans-serif',
      theme: 'glass'
    };
  }

  private injectStyles() {
    if (!this.branding) return;
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --vexa-primary: ${this.branding.primaryColor};
        --vexa-font: ${this.branding.fontFamily};
      }
      .vexa-trigger {
        background: var(--vexa-primary);
        font-family: var(--vexa-font);
        border-radius: 99px;
        padding: 12px 24px;
        color: white;
        font-weight: bold;
        cursor: pointer;
        border: none;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
  }

  private mountExperience() {
    const container = document.getElementById(this.config.containerId);
    if (!container) return;

    const button = document.createElement('button');
    button.className = 'vexa-trigger';
    button.innerHTML = '✨ Virtual Try-On';
    button.onclick = () => this.openOverlay();
    
    container.appendChild(button);
  }

  private openOverlay() {
    console.log('[VEXA SDK] Opening VEXA Studio Overlay');
    // Logic to open iframe or react-portal overlay
  }

  static trackEvent(type: string, metadata: any) {
    // Call /api/enterprise/analytics/track
    console.log(`[VEXA SDK] Tracking event: ${type}`, metadata);
  }
}

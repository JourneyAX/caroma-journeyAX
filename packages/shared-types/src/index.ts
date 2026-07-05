export interface TenantConfig {
  tenantId: string;
  slug: string;
  companyName: string;
  domain: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    logoUrl?: string;
    visualizerEnabled?: boolean;
  };
  scope: {
    rooms: string[];
    finishes: string[];
    categories?: string[];
  };
  pricing: {
    currency: string;
    symbol: string;
    taxRate: number;
    discountRate: number;
  };
  persona: {
    systemName: string;
    systemPromptOverrides: string;
  };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'buyer' | 'cs' | 'rep';
  createdAt: Date;
}

export interface BomItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  isRequired: boolean;
  reason?: string;
}

export interface Quote {
  id: string;
  tenantId: string;
  userId: string;
  quoteTitle: string;
  jobId: string;
  status: 'draft' | 'ordered' | 'abandoned';
  totals: {
    subtotal: number;
    discount: number;
    gst: number;
    total: number;
  };
  bom: BomItem[];
  installationSummary?: string;
  warrantySummary?: string;
  createdAt: Date;
}

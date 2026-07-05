# JourneyAX - Enterprise SaaS Configuration Spec

This document details how tenant-specific profiles, styling rules, business limits, and LLM behaviors are managed dynamically at runtime without codebase redeployments.

---

## 1. Directory Structure

Tenant profiles are stored in the `/config/tenants/` directory as structured YAML files. These files are parsed into cached config objects when the API Gateway forwards a request with a valid `X-Tenant-ID` header.

```text
config/tenants/
├── caroma.yaml
├── qzero.yaml
└── rentacenter.yaml
```

---

## 2. Tenant YAML Configuration Template

Below is the standard, production-grade configuration template (`tenant-schema`).

```yaml
# ==========================================
# JourneyAX Tenant Profile Schema
# ==========================================

tenantId: "caroma"
name: "Caroma Industries"
enabled: true

# ── 1. BRAND STYLING & THEMING ──────────────────────
theme:
  primaryColor: "#0F172A"       # Deep Slate
  accentColor: "#D97706"        # Amber Accent
  fontFamily: "Outfit, sans-serif"
  logoUrl: "https://cdn.caroma.com/brand/logo.svg"
  visualizerEnabled: true        # Show the 3D builder panel

# ── 2. PRODUCT SCOPE & SCOPE LIMITS ─────────────────
scope:
  rooms:
    - "bathroom"
    - "kitchen"
    - "laundry"
  finishes:
    - label: "Chrome"
      value: "chrome"
      hex: "#E2E8F0"
    - label: "Matte Black"
      value: "matte_black"
      hex: "#09090B"
    - label: "Brushed Brass"
      value: "brushed_brass"
      hex: "#CA8A04"
    - label: "Brushed Nickel"
      value: "brushed_nickel"
      hex: "#94A3B8"
  categories:
    - "Tapware"
    - "Toilet Suites"
    - "Basins"
    - "Baths"
    - "Showers"

# ── 3. BUSINESS & FINANCIAL RULES ───────────────────
pricing:
  currency: "AUD"
  symbol: "$"
  taxRate: 0.10                  # GST
  discountRate: 0.12            # Default discount applied to BOM quotes
  addons:
    - id: "installation_warranty"
      name: "Premium Plumber Certification"
      price: 199.00
    - id: "sealant_kit"
      name: "Waterproof Sealant & Install kit"
      price: 25.00

# ── 4. PERSONA & LLM BEHAVIOR ──────────────────────
persona:
  systemName: "Caroma Assistant"
  systemPromptOverrides: |
    You are a premium product designer for Caroma Australian bathware.
    Focus strictly on luxury, lead-free brass tapware, and water-saving WELS metrics.
    When discussing warranties, remind the user of the 20-year Caroma product warranty.
  mcpTools:
    - "searchKnowledge"
    - "showProducts"
    - "showGuide"
    - "updateQuote"
```

---

## 3. Dynamic Configuration Loader (TypeScript)

To ensure **no hardcoded values**, the Next.js backend reads this file dynamically:

```typescript
// services/config/tenant.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface TenantConfig {
  tenantId: string;
  name: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    logoUrl: string;
  };
  scope: {
    rooms: string[];
    finishes: Array<{ label: string; value: string; hex: string }>;
  };
  pricing: {
    currency: string;
    taxRate: number;
    discountRate: number;
  };
  persona: {
    systemName: string;
    systemPromptOverrides: string;
  };
}

const configCache: Record<string, TenantConfig> = {};

export async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  // Return cached config to optimize performance
  if (configCache[tenantId]) {
    return configCache[tenantId];
  }

  const filePath = path.join(process.cwd(), 'config', 'tenants', `${tenantId}.yaml`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Tenant configuration for ${tenantId} not found.`);
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const config = yaml.load(fileContents) as TenantConfig;
  
  configCache[tenantId] = config;
  return config;
}
```

---

## 4. UI Custom Styling Injection (Next.js layout)

In `layout.tsx`, the Next.js app injects the theme colors into the document root as CSS variables:

```tsx
// app/layout.tsx
import { getTenantConfig } from '@/services/config/tenant';

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { tenantId?: string };
}) {
  const tenantId = params.tenantId || 'caroma';
  const config = await getTenantConfig(tenantId);

  const cssVariables = {
    '--primary-color': config.theme.primaryColor,
    '--accent-color': config.theme.accentColor,
    '--font-family': config.theme.fontFamily,
  } as React.CSSProperties;

  return (
    <html lang="en" style={cssVariables}>
      <head>
        <title>{config.name} Configurator</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
```
In `globals.css`, components utilize these theme parameters natively:
```css
.chat-send-btn {
  background-color: var(--primary-color);
  font-family: var(--font-family);
}
.chat-suggestion:hover {
  border-color: var(--accent-color);
}
```
This guarantees that changing colors or fonts for a brand requires **zero code modifications**.

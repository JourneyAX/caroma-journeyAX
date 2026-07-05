---
name: journeyax-enterprise
description: Guidelines and best practices for configuring, scaling, and developing the JourneyAX multi-tenant Enterprise Agentic Commerce platform.
---

# JourneyAX Enterprise SaaS Development Skill

This skill contains the development guidelines, coding conventions, configuration guidelines, and deployment practices for the **JourneyAX Enterprise Agentic Commerce platform**. Activate this skill when adding brand configs, modifying UI components, developing back-office screens, implementing database queries, adjusting Kong routes, or configuring cloud deployments.

---

## 1. Monorepo & Workspace Management

When creating new modules or services, adhere to the **Turborepo** workspaces model:

* **Apps (`apps/`)**:
  - `journeyax-web/`: Contains Next.js chat configurator UI code.
  - `backoffice-admin/`: Contains brand console administration screens.
* **Packages (`packages/`)**:
  - Keep business calculations in `packages/configurator-core/`.
  - Share type models and schemas using `packages/shared-types/`.
* **Imports:** Always import shared packages using relative module namespaces:
  ```typescript
  import { Quote, BomItem } from '@journeyax/shared-types';
  ```

---

## 2. Frontend Design & Theming Guidelines

All client-facing interfaces must strictly align with the **JourneyAX Visual Foundations**:

### Color & Styling System
* **Brand Colors:** Signal Yellow (`#FFD600`), near-black (`#0A0A0A`), and white. No gradients are permitted on content cards or layouts.
* **Typography:**
  - **Space Grotesk:** (Google Font) Used for headings, stat numbers, buttons, tags, and labels. Set weight to 700/800 with a tight tracking of `-0.02em` to `-0.03em`.
  - **DM Sans:** (Google Font) Used for body copy. Set weight to 400/500 with a relaxed line-height of `1.65`.
* **The Corner Rule (SHARP):** Perfect zero-radius corners (`border-radius: 0`) are mandatory for all standard buttons, inputs, tags, stat blocks, and container cards.
* **The Rounding Exception (AGENT):** Rounding is reserved exclusively for the AI conversation components:
  - Chat bubbles: `16px` with an asymmetric flat corner on the speaker's side.
  - Plan cards: `12px` rounded.
  - Chat shell container: `16px` rounded.

### Customer Journey Studio Layout
* **Grid Split:** Fixed `40% / 60%` split container (Chat on the left, Configurator/Product canvas on the right) on desktop.
* **Responsive Collapsing:** Collapse to a single column under `880px` (Chat moves above the product canvas).

---

## 3. Back-Office Console Design Guidelines

The admin dashboard is authenticated, role-scoped, and program-scoped (e.g. an account manager can only see their assigned catalog and quotes).

### Required Views & Layouts
1. **SSO Login:** Built around native OAuth2/JWT auth (Okta/Azure AD) with MFA support.
2. **Dashboard:** KPI summary grids showing conversations, conversion funnel, cart→checkout rates, and average order values.
3. **Journey Builder:** A drag-and-drop ordered list question editor. Includes a branching logic editor: `IF Answer X -> Require/Exclude Product Tag Y`.
4. **Catalog & Compliance:** Table view of PIM/ERP synced products containing columns for margin limits, compliance status, and custom tags.
5. **Rosters & Orders (Inbox):** Split-pane layout:
   - *Left Pane:* List of active/abandoned customer conversations.
   - *Right Pane:* Full conversation transcript, configured quote total, and admin action buttons (Assign-to-rep, Convert-to-order, Add-notes).

---

## 4. Multi-Tenant MongoDB Standards

To maintain a **zero-deployment SaaS onboarding flow**, we use a **Shared Database, Shared Collection** strategy.

### Rules for Querying Catalogs & Transactions
1. **Always enforce tenant boundaries:** Every MongoDB read, write, or search aggregation **must** include a `tenantId` match filter:
   ```typescript
   const filter = { tenantId: activeTenantId };
   ```
2. **Embedded BOMs:** Do not split BOM rows into a separate collection. Store the Bill of Materials directly inside the `quotes` collection as an embedded array of subdocuments.
3. **Soft Category Filtering:** When searching the database, do not filter out scraped products that lack `metadata.category`. Use `$or` logic to allow documents where the field is missing or null:
   ```typescript
   filter['$or'] = [
     { 'metadata.category': category },
     { 'metadata.category': { $exists: false } },
     { 'metadata.category': null }
   ];
   ```

---

## 5. Dynamic Configuration & Theme Customization

No brand styles, colors, finishes, or business limits should be hardcoded in TypeScript/React files.

1. **Adding Tenants:** To onboard a new SaaS client, create a new YAML configuration under `/config/tenants/{tenantId}.yaml`.
2. **Reading Configurations:** Use the cached `getTenantConfig(tenantId)` service to dynamically load currency, tax, finishes, and prompts:
   ```typescript
   const tenantConfig = await getTenantConfig(tenantId);
   ```
3. **CSS Theming:** Always reference CSS variables (`var(--primary-color)`, `var(--accent-color)`) for custom buttons, inputs, and card layouts.

---

## 6. Cloud & Docker Deployments

For hosting the multi-tenant SaaS application, all monorepo components are containerized.

### Dockerfile Template for standalone Next.js App
We utilize multi-stage builds to optimize image sizes for Kubernetes / ECS deployments:

```dockerfile
# apps/journeyax-web/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/journeyax-web/package.json ./apps/journeyax-web/
RUN corepack enable && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm --filter journeyax-web build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/journeyax-web/public ./apps/journeyax-web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/journeyax-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/journeyax-web/.next/static ./apps/journeyax-web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/journeyax-web/server.js"]
```

### Docker Compose Local Orchestration
For local development and staging environments, we run Kong and the apps side-by-side:

```yaml
# docker-compose.yml
version: '3.8'

services:
  kong-gateway:
    image: kong:3.4
    volumes:
      - ./config/gateway:/usr/local/kong/declarative
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /usr/local/kong/declarative/kong.yml
      KONG_PROXY_LISTEN: 0.0.0.0:8000, 0.0.0.0:8443 ssl http2
    ports:
      - "80:8000"
      - "443:8443"
    depends_on:
      - journeyax-web

  journeyax-web:
    build:
      context: .
      dockerfile: apps/journeyax-web/Dockerfile
    environment:
      MONGODB_URI: "mongodb+srv://..."
      OPENAI_API_KEY: "sk-..."

  backoffice-admin:
    build:
      context: .
      dockerfile: apps/backoffice-admin/Dockerfile
    environment:
      MONGODB_URI: "mongodb+srv://..."
```

---

## 7. Observability & Logging Standards

We use the open-source **Grafana LGTM stack** (Loki for log analysis, Tempo for trace graphs).

1. **JSON Logging:** All service logs must be outputted via Pino/Winston in raw JSON format to stdout.
2. **Required Fields:** Include `tenantId`, `correlationId` (from headers), `timestamp`, and `message` in every log child scope:
   ```typescript
   logger.child({ tenantId, correlationId }).info("Initiated tool call updateQuote");
   ```
3. **Tracing LLMs:** Wrap all tool calls and vector searches using OTel trace spans to track latency in LangSmith or Tempo.

---
name: journeyax-enterprise
description: Guidelines and best practices for configuring, scaling, and developing the JourneyAX multi-tenant Enterprise Agentic Commerce platform.
---

# JourneyAX Enterprise SaaS Development Skill

This skill contains the development guidelines, coding conventions, configuration guidelines, and deployment practices for the **JourneyAX Enterprise Agentic Commerce platform**. Activate this skill when adding brand configs, implementing new MongoDB aggregations, adjusting Kong routes, or writing log statements.

---

## 1. Monorepo & Workspace Management

When creating new modules or services, adhere to the **Turborepo** workspaces model:

* **Apps (`apps/`)**:
  - `configurator-web/`: Contains Next.js chat configurator UI code.
  - `backoffice-admin/`: Contains brand console administration screens.
* **Packages (`packages/`)**:
  - Keep business calculations in `packages/configurator-core/`.
  - Share type models and schemas using `packages/shared-types/`.
* **Imports:** Always import shared packages using relative module namespaces:
  ```typescript
  import { Quote, BomItem } from '@journeyax/shared-types';
  ```

---

## 2. Multi-Tenant MongoDB Standards

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

## 3. Dynamic Configuration & Theme Customization

No brand styles, colors, finishes, or business limits should be hardcoded in TypeScript/React files.

1. **Adding Tenants:** To onboard a new SaaS client, create a new YAML configuration under `/config/tenants/{tenantId}.yaml`.
2. **Reading Configurations:** Use the cached `getTenantConfig(tenantId)` service to dynamically load currency, tax, finishes, and prompts:
   ```typescript
   const tenantConfig = await getTenantConfig(tenantId);
   ```
3. **CSS Theming:** Always reference CSS variables (`var(--primary-color)`, `var(--accent-color)`) for custom buttons, inputs, and card layouts.

---

## 4. API Gateway, Auth, & Routing (Kong Gateway)

We use **Kong API Gateway** for client routing, JWT verification, and rate-limiting.

1. **Routing:** Kong maps incoming subdomains (e.g. `caroma.journeyax.com`) to the Next.js configurator web app.
2. **Injected Headers:** The gateway validates JWT signatures and injects verified `X-Tenant-ID` headers to prevent SQL injection/NoSQL cross-tenant leaks.
3. **Cors Policies:** Configure CORS at the Gateway layer, not at the Next.js route handlers.

---

## 5. Observability & Logging Standards

We use the open-source **Grafana LGTM stack** (Loki for log analysis, Tempo for trace graphs).

1. **JSON Logging:** All service logs must be outputted via Pino/Winston in raw JSON format to stdout.
2. **Required Fields:** Include `tenantId`, `correlationId` (from headers), `timestamp`, and `message` in every log child scope:
   ```typescript
   logger.child({ tenantId, correlationId }).info("Initiated tool call updateQuote");
   ```
3. **Tracing LLMs:** Wrap all tool calls and vector searches using OTel trace spans to track latency in LangSmith or Tempo.

# JourneyAX - Enterprise Observability & Logging Spec

This document details the observability architecture, logging standards, log aggregation, and LLM tracing pipelines for the **JourneyAX SaaS platform**.

---

## 1. Unified Logging Architecture (Winston / Pino)

All services utilize **Pino** (high-performance JSON logger) or **Winston**. Log outputs are strictly structured in JSON format to be read natively by our log collection agents.

### Log Schema Fields
Every log statement **must** include the following meta-fields:
- `timestamp`: UTC iso timestamp.
- `level`: Log level (info, warn, error, debug).
- `tenantId`: Active tenant identifier (`X-Tenant-ID`).
- `correlationId`: Unique tracing ID (`x-correlation-id`) matching the client request to follow logs across services.
- `message`: Text description.
- `payload`: Optional JSON payload for error stack traces, tool inputs, or response metrics.

### Logging Implementation Example
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function logContext(tenantId: string, correlationId: string) {
  return logger.child({ tenantId, correlationId });
}
```

---

## 2. Open-Source Log Aggregator & Analyzer (Grafana Loki)

For log aggregation and analysis, we use **Grafana Loki** (the open-source Loki/Promtail stack).

### Grafana Loki Pipeline
1. **Promtail Agent:** Runs as a sidecar container in our docker/kubernetes cluster. It tails the JSON log files or reads Docker stdout.
2. **Parsing Rules:** Promtail parses the JSON logs and indexes them by `tenantId`, `level`, and `correlationId`.
3. **Loki Datastore:** A horizontally scalable, highly compressed log database.
4. **Grafana Dashboards:** Admins build custom Grafana dashboards to analyze request errors, LLM tool latency, and query patterns.

### LogQL Query Example (Find all failed tool calls for a specific tenant)
```logql
{app="journeyx-api", tenantId="caroma", level="ERROR"} | json | message =~ ".*tool_call.*failed.*"
```

---

## 3. Distributed Tracing & Metrics (OpenTelemetry + Tempo)

To trace requests across the API Gateway (Kong), Next.js backend, and the LLM engine, we use **OpenTelemetry (OTel)** instrumentation.

### Correlation ID Propagator Middleware
Kong API Gateway injects an `x-correlation-id` header if missing, and propagates it upstream:

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  const tenantId = request.headers.get('x-tenant-id') || 'caroma';

  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);
  response.headers.set('x-tenant-id', tenantId);
  
  return response;
}
```

This correlation ID is linked to **Grafana Tempo** traces, enabling developers to view a full span chart of:
- Kong routing latency
- Next.js API processing time
- OpenAI embedding/completions response durations
- MongoDB Vector Search read execution time

---

## 4. LLM & RAG Observability (LangSmith / Langfuse)

To debug the reasoning agent, we integrate **LangSmith** or **Langfuse** (open-source) in our backend.

### Tracing LLM Chains & Vector Retrievals
We wrap our OpenAI completions and MongoDB search functions to auto-report traces:

```typescript
// services/orchestration/trace.ts
import { logger } from '@/lib/logger';

export async function traceStep(
  name: string,
  tenantId: string,
  correlationId: string,
  fn: () => Promise<any>
) {
  const start = Date.now();
  const stepLogger = logger.child({ tenantId, correlationId, step: name });
  
  try {
    stepLogger.info({ message: `Starting step: ${name}` });
    const result = await fn();
    const duration = Date.now() - start;
    stepLogger.info({ message: `Step completed successfully`, duration, success: true });
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    stepLogger.error({ 
      message: `Step failed with error`, 
      duration, 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
}
```

### What We Monitor on LangSmith:
1. **Prompt Injections:** What context from the MongoDB search query was placed in the system prompt.
2. **Tool Failure Rates:** How often `updateQuote` or `showProducts` returned validation errors.
3. **Retrieval Score Quality:** The vector similarity scores of the top search results to see if the knowledge base matches the user's brief.
4. **Token Usage & Costs:** Exact input/output token counts to calculate per-tenant running costs.

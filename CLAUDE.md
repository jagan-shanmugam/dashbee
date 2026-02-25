# CLAUDE.md - Project Guidelines for Claude Code

## Project Overview

**DashBee** - AI-powered dashboard generator that creates dashboards from natural language prompts. Users describe what they want, and an LLM agent generates SQL queries and dynamic UI components rendered in real-time.

The application has two main interfaces:
- **Landing Page** (`/`) - Static marketing page with demo dashboards, powered by Supabase via ISR
- **Dashboard App** (`/dashboard`) - Interactive AI dashboard generator for user databases

### React & Frontend Best Practices

#### useEffect Usage

Using useEffect is often not necessary and can be avoided.

- Analyse the codebase for usage of useEffect hook, search all UI pages, components
- Refer to https://react.dev/learn/you-might-not-need-an-effect every time you write a useEffect.
- Also, refer to https://dev.to/paripsky/using-effects-effectively-in-react-stop-misusing-useeffect-once-and-for-all-5fpm every time you write a useEffect.

#### React Hooks Best Practices

- Wrap functions that are dependencies of `useMemo` or `useEffect` in `useCallback` to prevent unnecessary re-renders
- Move function definitions inside `useMemo` callback when they're only used there
- Always provide proper dependency arrays for hooks

#### TypeScript Strict Mode

- **Never use `any` or `unknown` types** - always provide proper TypeScript interfaces and types
- Use proper type guards when dealing with optional fields
- Define interfaces for all component props and API responses

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router) with Turbopack
- **React**: 19.2.3
- **TypeScript**: Strict mode enabled
- **AI**: Vercel AI SDK v6 (`ai` package) with tool use pattern
- **AI Providers**: OpenAI (`@ai-sdk/openai`), AI Gateway (`@ai-sdk/gateway`), OpenRouter (`@openrouter/ai-sdk-provider`), Gemini (`@ai-sdk/google`)
- **UI Rendering**: @json-render/react + @json-render/core for dynamic component rendering
- **Database**: Multi-database support
  - PostgreSQL (`pg`)
  - MySQL (`mysql2`)
  - SQLite (`better-sqlite3`)
  - Supabase (PostgreSQL via `pg`, used for landing page ISR/SSG)
- **Cloud Storage**: AWS S3 (`@aws-sdk/client-s3`), Google Cloud Storage (`@google-cloud/storage`)
- **File Parsing**: CSV (`papaparse`), Parquet (`parquet-wasm`, `apache-arrow`), Excel (`xlsx`)
- **Export**: PDF generation (`jspdf`, `html2canvas`)
- **Maps**: `maplibre-gl` for geographic visualizations
- **Validation**: Zod v4
- **Testing**: Vitest (unit), Playwright (e2e)
- **Observability**: Langfuse via OpenTelemetry (`@langfuse/otel`, `@opentelemetry/sdk-node`)
- **Package Manager**: pnpm
- **Containerization**: Docker with multi-arch support (amd64/arm64)

## Project Structure

```
instrumentation.ts      # OpenTelemetry + Langfuse initialization
Dockerfile              # Multi-stage Docker build (standalone output)
docker-compose.yml      # Full stack deployment with PostgreSQL
docker-compose.external-db.yml  # App-only deployment (external DB)
.dockerignore           # Docker build exclusions

app/                    # Next.js App Router
  api/                  # API routes
    generate-agentic/   # Main LLM agent endpoint
    execute-queries/    # Query execution with filters
    health/             # Health check endpoint (for Docker)
    schema/             # Database schema introspection
    test-connection/    # DB connection testing
    generate-questions/ # Generate follow-up questions
    cloud-storage/      # Cloud storage integration
      connect/          # Test and list buckets
      download/         # Download files from buckets
      list/             # List bucket contents
  page.tsx              # Landing page (ISR with Supabase data)
  landing-client.tsx    # Landing page client component
  dashboard/
    page.tsx            # Main dashboard application (AI generator)
  layout.tsx            # Root layout

components/
  ui/                   # UI component library
    index.ts            # Component registry export (28 components)
    *.tsx               # Data components (Chart, Table, Metric, etc.)
    *.tsx               # Layout components (Card, Grid, Stack, etc.)

lib/                    # Shared utilities
  db-adapters/          # Multi-database adapter system
    index.ts            # Adapter factory
    types.ts            # DatabaseAdapter interface
    postgres.ts         # PostgreSQL adapter
    mysql.ts            # MySQL adapter
    sqlite.ts           # SQLite adapter
    supabase.ts         # Supabase adapter (for landing page SSG/ISR)

  landing-data.ts       # Landing page data fetching from Supabase
  templates/            # Dashboard templates
    index.ts            # Template registry
  geo-data/             # Geographic data utilities
    index.ts            # Geo data exports
    us-states.json      # US state boundaries
    world-countries.json # World country data

  # Context providers (12 total)
  filter-context.tsx          # Global filter state
  drill-down-context.tsx      # Drill-down navigation
  data-source-context.tsx     # Database connection
  cloud-storage-context.tsx   # S3/GCS integration
  refresh-context.tsx         # Auto-refresh management
  chart-visibility-context.tsx# Toggle chart display
  style-preset-context.tsx    # Dashboard theming
  model-settings-context.tsx  # AI model configuration
  saved-queries-context.tsx   # Saved queries management
  sql-learnings-context.tsx   # SQL learning history
  column-annotations-context.tsx # Column metadata
  chart-catalog-context.tsx   # Chart type catalog

  # Core utilities
  ai-providers.ts       # AI model configuration (OpenAI/Azure/OpenRouter/Gemini)
  sql-agent.ts          # SQL tool definitions for LLM
  db.ts                 # Legacy database connection
  schema-introspector.ts# DB schema analysis
  catalog.ts            # Component catalog for prompts

  # Feature utilities
  filter-utils.ts       # Filter processing utilities
  filter-metadata.ts    # Filter metadata system
  color-palette.ts      # Chart color management
  export-utils.ts       # PDF/image export
  format-utils.ts       # Value formatting
  in-memory-db.ts       # In-memory data operations
  in-memory-sql-agent.ts# SQL agent for in-memory data
  parquet-parser.ts     # Parquet file parsing
  query-history.ts      # Query history tracking
  query-validator.ts    # SQL query validation
  style-presets.ts      # Dashboard styling themes
  llm-tasks.ts          # LLM task definitions
  api-cache.ts          # API response caching

docs/                   # Project documentation
  AZURE_SETUP.md        # Azure configuration guide
  BUSINESS_QUESTIONS.md # Sample business questions
  CACHING*.md           # Caching architecture docs
  ROADMAP.md            # Feature roadmap
  SAMPLE_QUERIES.md     # Example SQL queries
  SELF_HOSTING.md       # Docker deployment guide

scripts/                # Utility scripts
  seed-sqlite.ts        # Seed SQLite demo database
  seed-mysql.ts         # Seed MySQL demo database
  test-llm.ts           # LLM integration tests

sample-db/              # Docker database setup
  docker-compose.yml    # PostgreSQL + MySQL containers
  init.sql              # PostgreSQL seed data
  init-mysql.sql        # MySQL seed data

tests/
  api/                  # API route tests
  e2e/                  # Playwright e2e tests
    fixtures/           # E2E test data and config
  unit/                 # Vitest unit tests
    db-adapters/        # Database adapter tests
```

## Development Commands

```bash
pnpm dev          # Start dev server (Turbopack, port 3000)
pnpm build        # Production build
pnpm lint         # ESLint with --max-warnings 0
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright e2e tests
pnpm test:llm     # LLM integration tests
pnpm test:all     # Run all tests

# Database-specific E2E tests
pnpm test:e2e:postgres   # Test with PostgreSQL
pnpm test:e2e:mysql      # Test with MySQL
pnpm test:e2e:sqlite     # Test with SQLite
pnpm test:e2e:all-dbs    # Test all databases

# Database management
pnpm docker:up           # Start all sample containers
pnpm docker:up:postgres  # Start only PostgreSQL
pnpm docker:up:mysql     # Start only MySQL
pnpm docker:down         # Stop all containers
pnpm db:seed-sqlite      # Seed SQLite database
pnpm db:seed-mysql       # Seed MySQL database

# Utility
pnpm clean               # Clean build artifacts

# Docker (self-hosting)
docker compose up -d              # Start full stack (app + PostgreSQL)
docker compose -f docker-compose.external-db.yml up -d  # App only
docker compose down               # Stop all containers
docker compose logs -f app        # View app logs
docker build -t dashbee:local .   # Build image locally
```

## Docker Hub

Pre-built images available at `jagansh/dashbee`:

```bash
# Pull and run (any architecture)
docker run -d -p 3000:3000 \
  -e OPENAI_API_KEY=sk-your-key \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  jagansh/dashbee:latest
```

| Tag | Architectures |
|-----|---------------|
| `latest` | linux/amd64, linux/arm64 |
| `0.1.0` | linux/amd64, linux/arm64 |

## Key Patterns

### 1. Agentic SQL Tool Pattern

The LLM agent uses tools defined in `lib/sql-agent.ts`:

- `execute_sql` - Execute and validate SQL queries with retry on error
- `get_schema` - Retrieve database schema for context

```typescript
// Tool results include success status for self-correction
interface SQLToolResult {
  key: string;
  success: boolean;
  rows?: unknown[];
  error?: string;
}
```

### 2. Streaming UI via JSONL Patches

The agent streams JSON patches to build the UI incrementally:

```json
{"op":"set","path":"/root","value":"main-card"}
{"op":"add","path":"/elements/main-card","value":{"type":"Card","props":{}}}
```

### 3. Component Registry

Components are registered in `components/ui/index.ts` and rendered dynamically via @json-render. There are **28 components** total:

```typescript
export const componentRegistry = {
  // Layout components (10)
  Alert,
  Badge,
  Card,
  Divider,
  Empty,
  Grid,
  Heading,
  Stack,
  Text,
  Insight,

  // Data components (4)
  Metric,
  Chart,
  Table,
  Filter, // No-op, filters rendered via FilterBar

  // Basic chart types (6)
  Heatmap,
  MapChart,
  Scatter,
  Histogram,
  Boxplot,
  StackedChart,

  // Priority 1 chart types (5)
  DonutChart,
  MultiLineChart,
  GaugeChart,
  FunnelChart,
  Treemap,

  // Priority 2 chart types (3)
  WaterfallChart,
  RadarChart,
  BulletChart,
};
```

### 4. Filter Metadata System

Preferred approach for parameterized queries (see `lib/filter-metadata.ts`):

```typescript
// filterMeta describes how to apply user filters to queries
execute_sql({
  key: "revenue",
  sql: "SELECT SUM(amount) FROM orders",
  filterMeta: [
    { id: "date_from", column: "created_at", operator: "gte", type: "date" },
  ],
});
```

### 5. Multi-Database Adapter Pattern

The adapter pattern enables support for multiple database types (`lib/db-adapters/types.ts`):

```typescript
interface DatabaseAdapter {
  readonly type: DatabaseType;
  query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  introspectSchema(schemas?: string[]): Promise<TableInfo[]>;
  testConnection(): Promise<void>;
  close(): Promise<void>;
}

type DatabaseType = "postgresql" | "mysql" | "sqlite";
```

**Available Adapters (4 total):**
- `PostgresAdapter` - Standard PostgreSQL connections
- `MySQLAdapter` - MySQL/MariaDB connections
- `SQLiteAdapter` - Local SQLite databases
- `SupabaseAdapter` - Supabase PostgreSQL (used specifically for landing page SSG/ISR data fetching)

### 6. Context Providers

The application uses multiple React Context providers for state management:

- `FilterProvider` - Global filter state
- `DataSourceProvider` - Database connection
- `CloudStorageProvider` - S3/GCS integration
- `RefreshProvider` - Auto-refresh management
- `ChartVisibilityProvider` - Toggle chart display
- `StylePresetProvider` - Dashboard theming
- `ModelSettingsProvider` - AI model configuration
- `SavedQueriesProvider` - Query persistence
- `DrillDownProvider` - Drill-down navigation

### 7. Style Presets

Dashboard theming via `lib/style-presets.ts`:

```typescript
interface StylePreset {
  name: string;
  colors: string[];
  fontFamily: string;
  borderRadius: string;
}
```

### 8. LLM Observability via OpenTelemetry

All LLM calls use the AI SDK's `experimental_telemetry` feature for automatic tracing to Langfuse:

```typescript
import { streamText } from "ai";

const result = streamText({
  model: model,
  system: systemPrompt,
  prompt: prompt,
  tools,
  experimental_telemetry: {
    isEnabled: true,
    functionId: "generate-dashboard",
    metadata: { dataSourceType: "database" },
  },
});
```

This automatically traces:
- All `generateText` and `streamText` calls
- All tool executions (including SQL queries with inputs/outputs)
- Multi-step agent workflows
- Token usage and latency

The `instrumentation.ts` file initializes OpenTelemetry with `LangfuseSpanProcessor` on server startup. See `docs/LANGFUSE_INTEGRATION.md` for full documentation.

## Code Conventions

### TypeScript

- Strict mode enabled
- Unused variables prefixed with `_` (e.g., `_unusedParam`)
- Avoid `any` - use `unknown` with type guards
- Use Zod for runtime validation

### ESLint

Uses flat config format (`eslint.config.js`):

- `@eslint/js` recommended rules
- `typescript-eslint` recommended configs
- `@next/eslint-plugin-next` for Next.js rules
- `eslint-plugin-react-hooks` for React hooks
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: warn (ignores `_` prefix)

### React

- Use `"use client"` directive for client components
- Context providers for shared state (see Context Providers pattern)
- Custom hooks for complex logic (e.g., `useSQLDashboardStream`)

### API Routes

- Return `Response` objects directly
- Use `streamText` from AI SDK for streaming responses
- Handle errors with proper status codes

## Environment Variables

Required in `.env.local`:

```env
# AI Configuration
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://...  # Optional for Azure
AI_GATEWAY_MODEL=gpt-5       # Or anthropic/claude-haiku-4.5

# OpenRouter (alternative AI provider)
OPENROUTER_API_KEY=

# Gemini (Google AI provider)
GEMINI_API_KEY=

# PostgreSQL Connection
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_SSL=false
ALLOWED_SCHEMAS=public
MAX_QUERY_ROWS=1000
QUERY_TIMEOUT_MS=5000

# Supabase Connection (for landing page demo)
SUPABASE_CONNECTION_STRING=postgresql://user:password@db.your-project.supabase.co:5432/postgres

# MySQL Connection
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=demo
MYSQL_USER=mysql
MYSQL_PASSWORD=mysql

# SQLite
SQLITE_PATH=./data/demo.db

# Cloud Storage (S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# Cloud Storage (GCS)
GCS_PROJECT_ID=
GCS_KEY_FILE=  # Base64-encoded service account JSON

# Langfuse Observability (optional - app works without these)
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or self-hosted URL
```

## Testing Guidelines

### Unit Tests (Vitest)

- Located in `tests/unit/` and `tests/api/`
- Mock external dependencies with `vi.mock()`
- Use `describe/it/expect` pattern
- Database adapter tests in `tests/unit/db-adapters/`

### E2E Tests (Playwright)

- Located in `tests/e2e/`
- Fixtures in `tests/e2e/fixtures/`
- Configured with `postgres`, `mysql`, `sqlite`, and `chromium` projects
- Tests run on port 3002
- Use page object pattern when needed

## Important Files

- `app/api/generate-agentic/route.ts` - Main agent endpoint with system prompt
- `app/page.tsx` - Landing page (ISR with Supabase data)
- `app/landing-client.tsx` - Landing page client component
- `app/dashboard/page.tsx` - Main dashboard UI with streaming logic
- `lib/sql-agent.ts` - SQL tool definitions
- `lib/ai-providers.ts` - Model provider configuration (OpenAI/Azure/OpenRouter/Gemini)
- `lib/landing-data.ts` - Landing page data fetching functions
- `lib/db-adapters/index.ts` - Database adapter factory
- `lib/db-adapters/types.ts` - Adapter interface definitions
- `lib/db-adapters/supabase.ts` - Supabase adapter for landing page
- `lib/export-utils.ts` - Dashboard export functionality
- `lib/style-presets.ts` - Dashboard theming system
- `app/api/cloud-storage/` - Cloud storage endpoints
- `components/ui/index.ts` - Component registry (28 components)
- `instrumentation.ts` - OpenTelemetry/Langfuse initialization
- `docs/LANGFUSE_INTEGRATION.md` - LLM observability documentation
- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Full stack deployment with bundled PostgreSQL
- `docker-compose.external-db.yml` - App-only deployment for external databases
- `app/api/health/route.ts` - Health check endpoint for container orchestration
- `docs/SELF_HOSTING.md` - Self-hosting and Docker deployment guide

## Docs

After every implementation or code change, update the relevant documentation in the `docs/` folder to reflect new features, architectural decisions, or usage instructions. This ensures that the documentation remains accurate and helpful for current and future developers.
Make sure to update - docs/dashb-architecture.drawio

# DashBee

[![CI](https://github.com/jagan-shanmugam/dashbee/actions/workflows/ci.yml/badge.svg)](https://github.com/jagan-shanmugam/dashbee/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Last Commit](https://img.shields.io/github/last-commit/jagan-shanmugam/dashbee)](https://github.com/jagan-shanmugam/dashbee/commits/main)

**AI-powered dashboard generator.** Describe what you want in natural language, and an LLM agent generates SQL queries and dynamic UI components in real-time.

![DashBee Demo](screenshots/demo.gif)

> _Type a question → AI writes SQL → Dashboard renders instantly_

## Quick Start

```bash
# Install dependencies
pnpm install

# Start sample databases (PostgreSQL + MySQL)
pnpm docker:up

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Configuration

Copy `.env.example` to `.env.local` and configure:

```env
# Required: AI Provider
OPENAI_API_KEY=your-key
AI_GATEWAY_MODEL=gpt-5  # or anthropic/claude-haiku-4.5

# Optional: Database (can also configure via UI)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/demo

# Optional: LLM Observability
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

## Features

- **Multi-database**: PostgreSQL, MySQL, SQLite
- **File uploads**: CSV, Excel, JSON, Parquet
- **Cloud storage**: Connect directly to S3 or GCS buckets — analyze large datasets without downloading
- **Scale**: Handle millions of rows from cloud data lakes
- **LLM observability**: Langfuse via OpenTelemetry

## Sample Databases

The project includes two different sample datasets for testing:

| Database       | Theme             | Data                                                        |
| -------------- | ----------------- | ----------------------------------------------------------- |
| **PostgreSQL** | E-commerce        | Customers, orders, products, daily metrics                  |
| **MySQL**      | SaaS/Subscription | Organizations, users, plans, MRR, usage events (500K+ rows) |

```bash
# Seed MySQL with SaaS data
pnpm db:seed-mysql

# Seed SQLite with e-commerce data
pnpm db:seed-sqlite
```

<details>
<summary>More demos</summary>

![Explore the data](screenshots/demo-hd.gif)

![Explore the data](screenshots/demo-dark.gif)

**MySQL SaaS Dashboard (MRR Trends)**
![MySQL SaaS Dashboard](screenshots/sample-01.png)

**Light Mode**
![Light Mode](screenshots/sample-02.png)

</details>

## Development

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test         # Unit tests
pnpm test:e2e     # E2E tests
pnpm lint         # Linting
```

## Documentation

- `CLAUDE.md` - Project guidelines and patterns
- `docs/` - Feature documentation

## Community

- 💬 [GitHub Discussions](https://github.com/jagan-shanmugam/dashbee/discussions) — Questions & ideas
- 🐛 [Issues](https://github.com/jagan-shanmugam/dashbee/issues) — Bug reports & feature requests

⭐ **If you find DashBee useful, please consider giving it a star!** It helps others discover the project.

## License

MIT License - see [LICENSE](LICENSE) for details.

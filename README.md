# AU Sentinel

**News Monitoring & Emergency Alert Platform for African Union Member States**

AU Sentinel is a comprehensive, open-source platform that ingests news from open sources, classifies articles using AI (or rule-based fallback), performs threat assessment, and serves them through a country-scoped dashboard with real-time alerts, DNS intelligence, and multi-language support (English/Arabic with RTL).

---

## Features

### Core Platform
- Multi-language support (English/Arabic) with automatic RTL layout
- JWT authentication & role-based authorization (User, Editor, CountryAdmin, AUAdmin)
- Country-scoped multi-tenancy with audit logging
- User profiles with avatars and metadata

### User Engagement
- Bookmark articles with custom collections
- Community voting (REAL / MISLEADING / UNSURE)
- Gamification system with XP, 10 levels (Novice to Elite), and 22 badges
- Leaderboard with global/country rankings

### Search & Import
- Advanced search with boolean operators (AND/OR/NOT), phrase matching, wildcards
- Field-specific searches (title, body, category)
- Saved searches with execution tracking
- Keyword list management
- Bulk CSV import (Articles, Users, Sources, Keywords) with background processing

### Intelligence Tools
- DNS lookup & analysis (A/MX/TXT/NS records, IP geolocation, risk scoring)
- Domain watchlist (Monitor/Block/Trust with detection tracking)
- Bulletin management with draft/review/publish workflow
- Alert rules with configurable notifications

### Coming Soon
- External search integration (Twitter/X, Reddit, NewsAPI)
- Face detection & AI-powered person recognition
- Unified search with command palette (Ctrl+K)

---

## Architecture

```
 RSS / GDELT / MediaCloud
         |
         v
 +-----------------+     +------------+     +---------+
 | Ingestion Worker| --> | AI Worker  | --> | Indexer  |
 +-----------------+     +------------+     +---------+
         |                     |                 |
    RabbitMQ              RabbitMQ          RabbitMQ
         |                     |                 |
         v                     v                 v
    PostgreSQL            PostgreSQL         OpenSearch
                                                 |
                                                 v
                                          ASP.NET Core API
                                                 |
                                                 v
                                          Angular Frontend
```

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | Angular 17+, Angular Material, Signals  |
| Backend API    | ASP.NET Core 8, Entity Framework Core   |
| Workers        | .NET 8 Worker Services                  |
| Database       | PostgreSQL 16                           |
| Cache          | Redis 7                                 |
| Search         | OpenSearch 2.x                          |
| Message Queue  | RabbitMQ 3.x                            |
| Object Storage | MinIO (optional)                        |
| AI             | Local LLM via HTTP or rule-based        |
| Containers     | Docker Compose                          |

---

## Project Structure

```
osentLib/
├── backend/
│   ├── api/                    # REST API (ASP.NET Core 8)
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Data/Entities/
│   │   ├── Models/
│   │   ├── Middleware/
│   │   └── Migrations/
│   ├── shared/                 # Shared libraries
│   └── workers/
│       ├── ai-worker/          # Article classification
│       ├── ingestion-worker/   # RSS/GDELT feed aggregation
│       └── indexer-worker/     # OpenSearch indexing
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── core/           # Services, guards, interceptors
│       │   ├── features/       # Feature components
│       │   └── shared/         # Shared components
│       └── assets/i18n/        # Translation files (en, ar)
├── infra/
│   ├── docker-compose.yml      # Infrastructure services
│   ├── postgres/init.sql
│   └── opensearch/
├── Start-AUSentinel.ps1        # One-command launcher
├── Stop-AUSentinel.ps1         # Stop all services
└── osentLib.sln                # .NET solution file
```

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)

### One-Command Launch (Windows)

```powershell
.\Start-AUSentinel.ps1
```

This will check prerequisites, start Docker services, launch the backend API, and start the frontend dev server.

### Manual Launch

```bash
# 1. Start infrastructure services
cd infra
docker compose up -d

# 2. Start backend API (new terminal)
cd backend/api
dotnet restore
dotnet run

# 3. Start frontend (new terminal)
cd frontend
npm install    # first time only
npm start
```

### Access Points

| Service         | URL                          |
|-----------------|------------------------------|
| Web App         | http://localhost:4200         |
| API             | http://localhost:5000         |
| Swagger Docs    | http://localhost:5000/swagger |
| RabbitMQ UI     | http://localhost:15672        |
| OpenSearch      | http://localhost:9200         |
| MinIO Console   | http://localhost:9001         |

### Default Credentials

- **Admin:** admin / Admin123!
- **User:** user / User123!

---

## Docker Services

```yaml
PostgreSQL:         localhost:5432    # Main database
Redis:              localhost:6379    # Cache & sessions
RabbitMQ:           localhost:5672    # Message queue
OpenSearch:         localhost:9200    # Full-text search
MinIO:              localhost:9000    # Object storage
OpenSearch Dashboards: localhost:5601 # Search analytics
```

---

## Development

### Backend

```bash
cd backend/api
dotnet restore           # Restore packages
dotnet ef database update # Apply migrations
dotnet run               # Start API
dotnet watch run         # Start with hot reload
```

### Frontend

```bash
cd frontend
npm install              # Install dependencies
npm start                # Start dev server (localhost:4200)
npm run build            # Production build
```

### Database Migrations

```bash
cd backend/api
dotnet ef migrations add MigrationName   # Create migration
dotnet ef database update                # Apply migrations
dotnet ef migrations remove              # Remove last migration
```

---

## Security

- JWT-based authentication with configurable expiry
- Role-based authorization (User, Editor, CountryAdmin, AUAdmin)
- Country-scoped multi-tenancy isolation
- BCrypt password hashing
- CORS protection
- Input validation (FluentValidation)
- SQL injection prevention (EF Core parameterization)
- XSS protection (Angular sanitization)

---

## Roadmap

- [x] Phase 1: Foundation (i18n, User Profiles)
- [x] Phase 2: User Engagement (Bookmarks, XP, Badges, Leaderboard)
- [x] Phase 3: Enhanced Search (Advanced Query, Bulk Import)
- [x] Phase 4: Intelligence Tools (DNS Lookup, Domain Watchlist)
- [ ] Phase 5: External Search Integration (Twitter, Reddit, NewsAPI)
- [ ] Phase 6: Advanced AI (Face Detection, POI Database, Unified Search)

---

## License

Proprietary - African Union Member States

---

**Version:** 1.0.0-beta

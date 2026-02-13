# AU Sentinel - News Monitoring & Emergency Alert Platform

A comprehensive news monitoring and emergency alert platform for African Union member states, featuring real-time news ingestion, AI-powered classification, threat assessment, DNS intelligence, and multi-language support.

## 🚀 Quick Start

### Prerequisites

1. **Docker Desktop** (Required)
   - Download: https://www.docker.com/products/docker-desktop
   - Install and restart your computer
   - Start Docker Desktop and wait for it to be ready

2. **.NET 8 SDK** (Required for Backend)
   - Download: https://dotnet.microsoft.com/download/dotnet/8.0

3. **Node.js 18+** (Required for Frontend)
   - Download: https://nodejs.org/

### Launch AU Sentinel

**Method 1: PowerShell Script (Recommended)**

```powershell
# Open PowerShell in C:\osentLib
cd C:\osentLib

# Run the launcher
.\Start-AUSentinel.ps1
```

**Method 2: Manual Start**

```powershell
# 1. Start Docker services
cd C:\osentLib\infra
docker compose up -d

# 2. Start Backend (in new terminal)
cd C:\osentLib\backend\api
dotnet run

# 3. Start Frontend (in new terminal)
cd C:\osentLib\frontend
npm install  # First time only
npm start
```

### Access the Application

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:5000
- **Swagger Docs:** http://localhost:5000/swagger
- **RabbitMQ UI:** http://localhost:15672 (guest/guest)

### Default Credentials

Check backend console logs for seeded users, typically:
- **Admin:** admin / Admin123!
- **User:** user / User123!

## 📋 Features

### Phase 1: Foundation ✅
- ✅ Multi-language support (English/Arabic) with RTL layout
- ✅ User authentication & authorization (JWT)
- ✅ User profiles with avatars and metadata

### Phase 2: User Engagement ✅
- ✅ Bookmark articles with collections
- ✅ Gamification system with XP and levels (10 levels: Novice → Elite)
- ✅ Badges across 5 categories (22 badges total)
- ✅ Leaderboard with global/country rankings
- ✅ Activity logging

### Phase 3: Enhanced Search ✅
- ✅ Advanced search with boolean operators (AND/OR/NOT)
- ✅ Phrase matching, wildcards, field-specific searches
- ✅ Saved searches with execution tracking
- ✅ Keyword list management
- ✅ Bulk import functionality (CSV)
  - Articles, Users, Sources, Keyword Lists
  - Background processing with progress tracking
  - Error reporting and rollback

### Phase 4: Intelligence Tools (In Progress)
- ✅ DNS Lookup & Analysis
  - A/MX/TXT/NS record lookups
  - IP geolocation
  - Risk assessment (0-100 score)
  - WHOIS data integration
- ✅ Domain Watchlist
  - Monitor/Block/Trust domains
  - Detection count tracking
  - Risk level management
- 🔄 External Search (Next)
  - Twitter/X integration
  - Reddit search
  - NewsAPI aggregation

### Phase 5: Advanced AI (Planned)
- 🔜 Face detection & recognition
- 🔜 Person of Interest (POI) database
- 🔜 Unified search interface
- 🔜 Command palette (Ctrl+K)

## 🛠️ Architecture

### Backend Stack
- **Framework:** ASP.NET Core 8
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Search:** OpenSearch 2.x
- **Queue:** RabbitMQ 3.12
- **Streaming:** Apache Kafka
- **ORM:** Entity Framework Core
- **API Docs:** Swagger/OpenAPI

### Frontend Stack
- **Framework:** Angular 17 (Standalone Components)
- **UI Library:** Angular Material
- **State:** Signals (Reactive)
- **i18n:** @ngx-translate
- **HTTP:** HttpClient with Interceptors

### Workers
- **AI Worker:** Article classification, sentiment analysis
- **Ingestion Worker:** RSS feed aggregation, deduplication
- **Alert Worker:** Rule evaluation, notifications

## 📁 Project Structure

```
C:\osentLib\
├── backend\
│   ├── api\                    # REST API (ASP.NET Core)
│   │   ├── Controllers\
│   │   ├── Services\
│   │   ├── Data\Entities\
│   │   └── Middleware\
│   ├── shared\                 # Shared libraries
│   └── workers\               # Background workers
│       ├── ai-worker\
│       ├── ingestion-worker\
│       └── alert-worker\
├── frontend\
│   └── src\
│       ├── app\
│       │   ├── core\          # Services, guards, interceptors
│       │   ├── features\      # Feature modules
│       │   └── shared\        # Shared components
│       └── assets\
│           └── i18n\          # Translation files
├── infra\
│   └── docker-compose.yml     # Infrastructure services
├── Start-AUSentinel.ps1       # Launch script
├── Stop-AUSentinel.ps1        # Stop script
└── README.md                  # This file
```

## 🐳 Docker Services

```yaml
Services:
  - PostgreSQL:   localhost:5432  # Main database
  - Redis:        localhost:6379  # Cache & sessions
  - RabbitMQ:     localhost:5672  # Message queue
  - OpenSearch:   localhost:9200  # Full-text search
  - Kafka:        localhost:9092  # Event streaming
```

## 🔧 Development

### Backend Development

```powershell
cd C:\osentLib\backend\api

# Restore packages
dotnet restore

# Run migrations
dotnet ef database update

# Run API
dotnet run

# Watch mode (auto-reload)
dotnet watch run
```

### Frontend Development

```powershell
cd C:\osentLib\frontend

# Install dependencies
npm install

# Start dev server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Database Migrations

```powershell
cd C:\osentLib\backend\api

# Create migration
dotnet ef migrations add MigrationName

# Apply migrations
dotnet ef database update

# Rollback migration
dotnet ef database update PreviousMigrationName

# Remove last migration
dotnet ef migrations remove
```

## 📊 Database Schema

### Core Entities
- **Users & Auth:** User, UserProfile, Role, UserRole
- **News:** Article, Source, Classification, ArticleEntity
- **Engagement:** Vote, Bookmark, BookmarkCollection
- **Gamification:** UserExperience, Badge, UserBadge, ActivityLog
- **Search:** SavedSearch, KeywordList
- **Intelligence:** DnsLookup, DomainWatchlist
- **Alerts:** AlertRule, Alert, AlertDelivery
- **Content:** Bulletin, BulletinAttachment

## 🌍 Internationalization

Supported languages:
- **English (en)** - LTR
- **Arabic (ar)** - RTL with automatic layout adjustment

Translation files: `frontend/src/assets/i18n/`

## 🔐 Security Features

- JWT-based authentication
- Role-based authorization (User, Editor, CountryAdmin, AUAdmin)
- Country-scoped multi-tenancy
- Password hashing (BCrypt)
- CORS protection
- Input validation (FluentValidation)
- SQL injection prevention (EF Core parameterization)
- XSS protection (Angular sanitization)

## 📈 Performance Optimizations

- Redis caching for DNS lookups (24h TTL)
- OpenSearch for fast full-text search
- Pagination for all list endpoints
- Lazy loading for frontend routes
- Database indexes on frequently queried fields
- Background processing for expensive operations

## 🐛 Troubleshooting

### Docker Issues

**Problem:** "Docker is not running"
```powershell
# Start Docker Desktop manually
# Or from script:
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

**Problem:** "Port already in use"
```powershell
# Check what's using the port
netstat -ano | findstr :5432  # PostgreSQL
netstat -ano | findstr :5000  # Backend API
netstat -ano | findstr :4200  # Frontend

# Kill process by PID
taskkill /PID <pid> /F
```

### Backend Issues

**Problem:** "Failed to connect to database"
```powershell
# Check PostgreSQL is running
docker ps | findstr postgres

# Check connection string in appsettings.json
# Default: Host=localhost;Database=ausentinel;Username=postgres;Password=postgres
```

**Problem:** "Migration failed"
```powershell
# Drop database and recreate
docker compose down -v
docker compose up -d
dotnet ef database update
```

### Frontend Issues

**Problem:** "npm install fails"
```powershell
# Clear cache and retry
npm cache clean --force
Remove-Item node_modules -Recurse -Force
npm install
```

**Problem:** "Port 4200 is already in use"
```powershell
# Kill existing ng serve process
Get-Process -Name node | Stop-Process -Force

# Or use different port
ng serve --port 4300
```

## 🛑 Stopping Services

### Quick Stop (PowerShell Script)

```powershell
.\Stop-AUSentinel.ps1
```

### Manual Stop

```powershell
# Stop Docker services
cd C:\osentLib\infra
docker compose down

# Stop backend/frontend: Press Ctrl+C in their terminal windows
# Or kill processes:
Get-Process -Name dotnet | Stop-Process -Force
Get-Process -Name node | Stop-Process -Force
```

## 📝 Useful Commands

### Docker Commands

```powershell
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Restart service
docker compose restart postgres

# Stop all containers
docker compose down

# Stop and remove volumes (deletes data!)
docker compose down -v
```

### Backend Commands

```powershell
# Build project
dotnet build

# Run tests
dotnet test

# Publish for production
dotnet publish -c Release

# Add NuGet package
dotnet add package PackageName
```

### Frontend Commands

```powershell
# Add npm package
npm install package-name

# Update packages
npm update

# Lint code
npm run lint

# Format code
npm run format
```

## 📞 Support

For issues and questions:
1. Check this README
2. Review application logs
3. Check Docker service health: `docker compose ps`
4. Restart services: `.\Start-AUSentinel.ps1`

## 📜 License

Proprietary - African Union Member States

## 🎯 Roadmap

- [x] Phase 1: Foundation (i18n, Profiles)
- [x] Phase 2: User Engagement (Bookmarks, XP, Badges)
- [x] Phase 3: Enhanced Search (Advanced Query, Import)
- [ ] Phase 4: Intelligence Tools (DNS ✅, External Search 🔄)
- [ ] Phase 5: Advanced AI (Face Detection, Unified Search)

---

**Version:** 1.0.0-beta
**Last Updated:** 2026-02-11
**Platform:** Windows 10/11, Docker Desktop

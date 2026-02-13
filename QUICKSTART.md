# AU Sentinel - Quick Start Guide

## ⚡ 3-Step Launch

### 1️⃣ Install Prerequisites (One-time)

```powershell
# Install these if not already installed:
# - Docker Desktop: https://www.docker.com/products/docker-desktop
# - .NET 8 SDK: https://dotnet.microsoft.com/download/dotnet/8.0
# - Node.js 18+: https://nodejs.org/
```

### 2️⃣ Start AU Sentinel

```powershell
cd C:\osentLib
.\Start-AUSentinel.ps1
```

### 3️⃣ Open Browser

```
http://localhost:4200
```

## 🎯 That's It!

The script will:
- ✅ Check all prerequisites
- ✅ Start Docker services (PostgreSQL, Redis, RabbitMQ, etc.)
- ✅ Launch Backend API (http://localhost:5000)
- ✅ Launch Frontend (http://localhost:4200)
- ✅ Apply database migrations
- ✅ Show you the status

## 🛑 Stop Everything

```powershell
.\Stop-AUSentinel.ps1
```

## 🚨 If Docker Error

```powershell
# Error: "docker is not recognized"
# Solution: Install Docker Desktop, restart PC, then run script again
```

## 📱 Key URLs

| Service | URL |
|---------|-----|
| **Web App** | http://localhost:4200 |
| **API** | http://localhost:5000 |
| **Swagger Docs** | http://localhost:5000/swagger |
| **RabbitMQ** | http://localhost:15672 |

## 🔑 Default Login

Check the backend console window for seed data. Typically:
- **Username:** admin
- **Password:** Admin123!

## 🎮 Script Options

```powershell
# Skip Docker if already running
.\Start-AUSentinel.ps1 -SkipDocker

# Skip backend (only frontend)
.\Start-AUSentinel.ps1 -SkipBackend

# Skip frontend (only backend)
.\Start-AUSentinel.ps1 -SkipFrontend

# Reinstall npm packages
.\Start-AUSentinel.ps1 -InstallDependencies
```

## 🐛 Quick Fixes

### "Port already in use"
```powershell
# Find what's using the port
netstat -ano | findstr :5000

# Kill it
taskkill /PID <pid> /F
```

### "Database connection failed"
```powershell
# Restart Docker services
cd C:\osentLib\infra
docker compose restart postgres
```

### "Frontend won't start"
```powershell
cd C:\osentLib\frontend
Remove-Item node_modules -Recurse -Force
npm install
npm start
```

## 📚 Full Documentation

See **README.md** for complete documentation, architecture, and advanced features.

## 🎉 Features at a Glance

- ✅ Multi-language (English/Arabic with RTL)
- ✅ User profiles & authentication
- ✅ Bookmark articles & collections
- ✅ XP system with 10 levels & 22 badges
- ✅ Leaderboard rankings
- ✅ Advanced search with boolean operators
- ✅ Bulk CSV import
- ✅ DNS lookup & intelligence
- ✅ Domain watchlist
- ✅ Real-time alerts
- 🔄 External search (Twitter/Reddit/NewsAPI) - Coming soon
- 🔜 Face detection & AI analysis - Coming soon

---

**Need Help?** Check README.md or restart with `.\Start-AUSentinel.ps1`

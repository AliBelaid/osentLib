# AU Sentinel — Architecture

## Overview

AU Sentinel is an open-source news monitoring and emergency alert platform for African Union member states. It ingests news from free/open sources, classifies articles using AI (or rule-based fallback), indexes them for search and analytics, and serves them through a dashboard scoped by country.

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐     ┌───────────┐
│  GDELT API  │────▶│              │     │            │     │           │
│  RSS Feeds  │────▶│  Ingestion   │────▶│  AI Worker │────▶│  Indexer  │
│  MediaCloud │────▶│  Worker      │     │            │     │  Worker   │
└─────────────┘     └──────────────┘     └────────────┘     └───────────┘
                          │                    │                   │
                    article.ingested     article.classified   article.indexed
                     (RabbitMQ)           (RabbitMQ)          (RabbitMQ)
                          │                    │                   │
                          ▼                    ▼                   ▼
                    ┌──────────┐        ┌──────────┐        ┌────────────┐
                    │PostgreSQL│        │PostgreSQL │        │ OpenSearch │
                    │ Articles │        │ Classif.  │        │  Indices   │
                    └──────────┘        └──────────┘        └────────────┘
                                                                  │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │  ASP.NET     │
                                                          │  Core API    │
                                                          └──────────────┘
                                                                  │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │   Angular    │
                                                          │   Frontend   │
                                                          └──────────────┘
```

## Components

### 1. Ingestion Worker
- Runs on a schedule (every 10 minutes)
- Fetches articles from GDELT 2.1 DOC API, configured RSS feeds
- Normalizes raw data into canonical Article format
- Deduplicates using hash of (normalized title + URL domain + published date)
- Publishes `article.ingested` messages to RabbitMQ

### 2. AI Worker
- Consumes `article.ingested` from RabbitMQ
- If `LLM_ENDPOINT` is configured: sends article to local LLM for classification
- Otherwise: uses rule-based fallback classifier
- Produces: category, threat type, threat level (0–5), credibility score
- Stores Classification records in PostgreSQL
- Publishes `article.classified` to RabbitMQ

### 3. Indexer Worker
- Consumes `article.classified` from RabbitMQ
- Builds the final OpenSearch document
- Upserts into country-scoped OpenSearch indices (`au-news-*`)
- Publishes `article.indexed` to RabbitMQ

### 4. ASP.NET Core API
- JWT authentication with role-based access control
- Country scoping middleware: all queries filtered by user's country unless AUAdmin
- Endpoints: News, Votes, Bulletins, Alerts, Sources, Users
- Reads from OpenSearch for search/trends, PostgreSQL for CRUD
- Swagger/OpenAPI documentation

### 5. Angular Frontend
- Angular 17+ with Angular Material
- Dashboard with important news, alerts, trend widgets
- News search with faceted filters
- Community voting (REAL / MISLEADING / UNSURE)
- Bulletin management with draft/review/publish workflow
- Admin panels for sources and alert rules
- i18n ready (English + Arabic)

## Multi-Tenancy / Country Isolation

- Every user belongs to a country (ISO2 code)
- Middleware injects country filter on all data queries
- AUAdmin role can see all countries
- RBAC: Viewer, Editor, CountryAdmin, AUAdmin
- Audit logs track all mutations

## Technology Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | Angular 17+, Angular Material, RxJS |
| Backend API    | ASP.NET Core 8, EF Core, JWT       |
| Workers        | .NET 8 Worker Services              |
| Database       | PostgreSQL 16                       |
| Cache          | Redis 7                             |
| Search         | OpenSearch 2.x                      |
| Message Queue  | RabbitMQ 3.x                        |
| Object Storage | MinIO (optional)                    |
| AI             | Local LLM via HTTP or rule-based    |
| Logging        | Serilog                             |
| Validation     | FluentValidation                    |
| Containers     | Docker Compose                      |

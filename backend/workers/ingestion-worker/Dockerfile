FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["backend/workers/ingestion-worker/IngestionWorker.csproj", "backend/workers/ingestion-worker/"]
COPY ["backend/shared/AUSentinel.Shared/AUSentinel.Shared.csproj", "backend/shared/AUSentinel.Shared/"]
RUN dotnet restore "backend/workers/ingestion-worker/IngestionWorker.csproj"
COPY . .
WORKDIR /src/backend/workers/ingestion-worker
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "IngestionWorker.dll"]

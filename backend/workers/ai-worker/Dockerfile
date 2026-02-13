FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["backend/workers/ai-worker/AiWorker.csproj", "backend/workers/ai-worker/"]
COPY ["backend/shared/AUSentinel.Shared/AUSentinel.Shared.csproj", "backend/shared/AUSentinel.Shared/"]
RUN dotnet restore "backend/workers/ai-worker/AiWorker.csproj"
COPY . .
WORKDIR /src/backend/workers/ai-worker
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "AiWorker.dll"]

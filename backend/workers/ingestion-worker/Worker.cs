using AUSentinel.IngestionWorker.Services;
using AUSentinel.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AUSentinel.IngestionWorker;

public class Worker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<Worker> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(10);

    public Worker(IServiceProvider services, ILogger<Worker> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Ingestion Worker started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunIngestionCycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during ingestion cycle");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task RunIngestionCycleAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var gdelt = scope.ServiceProvider.GetRequiredService<GdeltFetcher>();
        var rss = scope.ServiceProvider.GetRequiredService<RssFetcher>();
        var publisher = scope.ServiceProvider.GetRequiredService<ArticlePublisher>();

        var sources = await db.Sources
            .Where(s => s.IsActive)
            .Where(s => s.LastFetchedAt == null ||
                        s.LastFetchedAt < DateTime.UtcNow.AddMinutes(-s.FetchIntervalMinutes))
            .ToListAsync(ct);

        _logger.LogInformation("Found {Count} sources due for fetching", sources.Count);

        foreach (var source in sources)
        {
            try
            {
                var articles = source.Type switch
                {
                    "GDELT" => await gdelt.FetchAsync(source, ct),
                    "RSS" => await rss.FetchAsync(source, ct),
                    _ => new List<RawArticle>()
                };

                _logger.LogInformation("Fetched {Count} articles from {Source}", articles.Count, source.Name);

                var saved = await publisher.PublishNewArticlesAsync(db, source, articles, ct);
                _logger.LogInformation("Saved {Count} new articles from {Source}", saved, source.Name);

                source.LastFetchedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching from source {Source}", source.Name);
            }
        }
    }
}

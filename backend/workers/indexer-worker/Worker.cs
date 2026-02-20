using System.Text;
using System.Text.Json;
using AUSentinel.Shared.Data;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace AUSentinel.IndexerWorker;

public class Worker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<Worker> _logger;
    private IConnection? _connection;
    private IModel? _channel;

    public Worker(IServiceProvider services, IConfiguration config, IHttpClientFactory httpFactory, ILogger<Worker> logger)
    {
        _services = services;
        _config = config;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Indexer Worker started, connecting to RabbitMQ...");

        var factory = new ConnectionFactory
        {
            HostName = _config["RabbitMQ:Host"] ?? "localhost",
            UserName = _config["RabbitMQ:Username"] ?? "ausentinel",
            Password = _config["RabbitMQ:Password"] ?? "ausentinel_dev_pwd",
            DispatchConsumersAsync = true
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();
        _channel.BasicQos(0, 5, false);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.Received += async (_, ea) =>
        {
            try
            {
                var body = Encoding.UTF8.GetString(ea.Body.ToArray());
                var msg = JsonSerializer.Deserialize<ArticleMessage>(body);

                if (msg?.ArticleId != null)
                {
                    await IndexArticleAsync(msg.ArticleId.Value, stoppingToken);
                }

                _channel.BasicAck(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing article.classified message");
                _channel.BasicNack(ea.DeliveryTag, false, true);
            }
        };

        _channel.QueueDeclare("article.classified", durable: true, exclusive: false, autoDelete: false);
        _channel.BasicConsume("article.classified", false, consumer);
        _logger.LogInformation("Consuming from article.classified queue");

        return Task.CompletedTask;
    }

    private async Task IndexArticleAsync(Guid articleId, CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var article = await db.Articles
            .Include(a => a.Source)
            .Include(a => a.Classification)
            .Include(a => a.Entities)
            .Include(a => a.CountryTags)
            .Include(a => a.Votes)
            .FirstOrDefaultAsync(a => a.Id == articleId, ct);

        if (article == null)
        {
            _logger.LogWarning("Article {Id} not found for indexing", articleId);
            return;
        }

        if (article.IsIndexed)
        {
            _logger.LogDebug("Article {Id} already indexed", articleId);
            return;
        }

        var document = new
        {
            articleId = article.Id.ToString(),
            title = article.Title,
            body = article.Body,
            summary = article.Classification?.Summary,
            url = article.Url,
            imageUrl = article.ImageUrl,
            sourceId = article.SourceId.ToString(),
            sourceName = article.Source.Name,
            sourceType = article.Source.Type,
            publishedAt = article.PublishedAt,
            ingestedAt = article.IngestedAt,
            classifiedAt = article.Classification?.ClassifiedAt,
            language = article.Language,
            countryTags = article.CountryTags.Select(ct => ct.CountryCode).ToArray(),
            categories = article.Classification != null ? new[] { article.Classification.Category } : Array.Empty<string>(),
            threatType = article.Classification?.ThreatType ?? "none",
            threatLevel = article.Classification?.ThreatLevel ?? 0,
            credibilityScore = article.Classification?.CredibilityScore ?? 0.5,
            entities = article.Entities.Select(e => new { name = e.Name, type = e.Type }).ToArray(),
            voteStats = new
            {
                realCount = article.Votes.Count(v => v.VoteType == "REAL"),
                misleadingCount = article.Votes.Count(v => v.VoteType == "MISLEADING"),
                unsureCount = article.Votes.Count(v => v.VoteType == "UNSURE")
            },
            dedupHash = article.DedupHash
        };

        var http = _httpFactory.CreateClient("opensearch");
        var json = JsonSerializer.Serialize(document);
        var response = await http.PutAsync(
            $"/au-news/_doc/{article.Id}",
            new StringContent(json, Encoding.UTF8, "application/json"),
            ct);

        if (response.IsSuccessStatusCode)
        {
            article.IsIndexed = true;
            await db.SaveChangesAsync(ct);
            PublishIndexed(article.Id);
            _logger.LogInformation("Indexed article {Id}", articleId);
        }
        else
        {
            var error = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("OpenSearch indexing failed for {Id}: {Error}", articleId, error);
        }
    }

    private void PublishIndexed(Guid articleId)
    {
        if (_channel == null) return;

        var json = JsonSerializer.Serialize(new { ArticleId = articleId });
        var body = Encoding.UTF8.GetBytes(json);
        var props = _channel.CreateBasicProperties();
        props.Persistent = true;
        props.ContentType = "application/json";
        _channel.BasicPublish("ausentinel.articles", "article.indexed", props, body);
    }

    public override void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }

    private record ArticleMessage(Guid? ArticleId);
}

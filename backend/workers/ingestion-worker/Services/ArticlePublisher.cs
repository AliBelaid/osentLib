using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using AUSentinel.Shared.Data;
using AUSentinel.Shared.Data.Entities;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;

namespace AUSentinel.IngestionWorker.Services;

public class ArticlePublisher : IDisposable
{
    private readonly IConnection? _connection;
    private readonly IModel? _channel;
    private readonly ILogger<ArticlePublisher> _logger;

    public ArticlePublisher(IConfiguration config, ILogger<ArticlePublisher> logger)
    {
        _logger = logger;
        var factory = new ConnectionFactory
        {
            HostName = config["RabbitMQ:Host"] ?? "localhost",
            UserName = config["RabbitMQ:Username"] ?? "ausentinel",
            Password = config["RabbitMQ:Password"] ?? "ausentinel_dev_pwd"
        };

        try
        {
            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();
            _channel.ExchangeDeclare("ausentinel.articles", ExchangeType.Topic, durable: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to RabbitMQ");
        }
    }

    public async Task<int> PublishNewArticlesAsync(AppDbContext db, Source source, List<RawArticle> rawArticles, CancellationToken ct)
    {
        var saved = 0;

        foreach (var raw in rawArticles)
        {
            if (string.IsNullOrWhiteSpace(raw.Title) || string.IsNullOrWhiteSpace(raw.Url))
                continue;

            var hash = ComputeDedupHash(raw.Title, raw.Url, raw.PublishedAt);

            var exists = await db.Articles.AnyAsync(a => a.DedupHash == hash, ct);
            if (exists) continue;

            var article = new Article
            {
                Title = raw.Title.Length > 512 ? raw.Title[..512] : raw.Title,
                Body = raw.Body,
                Url = raw.Url.Length > 2000 ? raw.Url[..2000] : raw.Url,
                ImageUrl = raw.ImageUrl,
                SourceId = source.Id,
                Language = raw.Language,
                PublishedAt = raw.PublishedAt,
                DedupHash = hash,
                IsProcessed = false,
                IsIndexed = false
            };

            db.Articles.Add(article);
            await db.SaveChangesAsync(ct);

            foreach (var countryCode in raw.CountryTags)
            {
                db.ArticleCountryTags.Add(new ArticleCountryTag
                {
                    ArticleId = article.Id,
                    CountryCode = countryCode
                });
            }
            await db.SaveChangesAsync(ct);

            PublishMessage(new { ArticleId = article.Id, SourceId = source.Id });
            saved++;
        }

        return saved;
    }

    private static string ComputeDedupHash(string title, string url, DateTime publishedAt)
    {
        var normalized = title.Trim().ToLowerInvariant();
        var domain = "";
        try { domain = new Uri(url).Host; } catch { }
        var input = $"{normalized}|{domain}|{publishedAt:yyyy-MM-dd}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private void PublishMessage(object message)
    {
        if (_channel == null) return;

        try
        {
            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);
            var props = _channel.CreateBasicProperties();
            props.Persistent = true;
            props.ContentType = "application/json";
            _channel.BasicPublish("ausentinel.articles", "article.ingested", props, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish article.ingested message");
        }
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}

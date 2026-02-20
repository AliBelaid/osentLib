using System.Text;
using System.Text.Json;
using AUSentinel.AiWorker.Services;
using AUSentinel.Shared.Data;
using AUSentinel.Shared.Data.Entities;
using Microsoft.EntityFrameworkCore;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace AUSentinel.AiWorker;

public class Worker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IConfiguration _config;
    private readonly ILogger<Worker> _logger;
    private IConnection? _connection;
    private IModel? _channel;

    public Worker(IServiceProvider services, IConfiguration config, ILogger<Worker> logger)
    {
        _services = services;
        _config = config;
        _logger = logger;
    }

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AI Worker started, connecting to RabbitMQ...");

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
                    await ClassifyArticleAsync(msg.ArticleId.Value, stoppingToken);
                }

                _channel.BasicAck(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing article.ingested message");
                _channel.BasicNack(ea.DeliveryTag, false, true);
            }
        };

        _channel.QueueDeclare("article.ingested", durable: true, exclusive: false, autoDelete: false);
        _channel.BasicConsume("article.ingested", false, consumer);
        _logger.LogInformation("Consuming from article.ingested queue");

        return Task.CompletedTask;
    }

    private async Task ClassifyArticleAsync(Guid articleId, CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ruleClassifier = scope.ServiceProvider.GetRequiredService<RuleBasedClassifier>();
        var llmClassifier = scope.ServiceProvider.GetRequiredService<LlmClassifier>();

        var article = await db.Articles
            .Include(a => a.Source)
            .FirstOrDefaultAsync(a => a.Id == articleId, ct);

        if (article == null || article.IsProcessed)
        {
            _logger.LogDebug("Article {Id} not found or already processed", articleId);
            return;
        }

        var llmEndpoint = _config["LLM:Endpoint"];
        ClassificationResult result;

        if (!string.IsNullOrEmpty(llmEndpoint))
        {
            result = await llmClassifier.ClassifyAsync(article.Title, article.Body, ct);
        }
        else
        {
            result = ruleClassifier.Classify(article.Title, article.Body);
        }

        var classification = new Classification
        {
            ArticleId = article.Id,
            Category = result.Category,
            ThreatType = result.ThreatType,
            ThreatLevel = result.ThreatLevel,
            CredibilityScore = result.CredibilityScore,
            Summary = result.Summary,
            ClassifiedBy = result.ClassifiedBy
        };

        db.Classifications.Add(classification);
        article.IsProcessed = true;
        await db.SaveChangesAsync(ct);

        PublishClassified(article.Id);
        _logger.LogInformation("Classified article {Id}: {Category}, threat={Level}", articleId, result.Category, result.ThreatLevel);
    }

    private void PublishClassified(Guid articleId)
    {
        if (_channel == null) return;

        var json = JsonSerializer.Serialize(new { ArticleId = articleId });
        var body = Encoding.UTF8.GetBytes(json);
        var props = _channel.CreateBasicProperties();
        props.Persistent = true;
        props.ContentType = "application/json";
        _channel.BasicPublish("ausentinel.articles", "article.classified", props, body);
    }

    public override void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
        base.Dispose();
    }

    private record ArticleMessage(Guid? ArticleId, int? SourceId);
}

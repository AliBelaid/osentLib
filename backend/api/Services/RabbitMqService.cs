using System.Text;
using System.Text.Json;
using RabbitMQ.Client;

namespace AUSentinel.Api.Services;

public interface IRabbitMqService
{
    void Publish<T>(string exchange, string routingKey, T message);
}

public class RabbitMqService : IRabbitMqService, IDisposable
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly ILogger<RabbitMqService> _logger;

    public RabbitMqService(IConfiguration config, ILogger<RabbitMqService> logger)
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

            // Declare exchanges
            _channel.ExchangeDeclare("ausentinel.articles", ExchangeType.Topic, durable: true);

            // Declare queues
            _channel.QueueDeclare("article.ingested", durable: true, exclusive: false, autoDelete: false);
            _channel.QueueDeclare("article.classified", durable: true, exclusive: false, autoDelete: false);
            _channel.QueueDeclare("article.indexed", durable: true, exclusive: false, autoDelete: false);

            // Bind queues
            _channel.QueueBind("article.ingested", "ausentinel.articles", "article.ingested");
            _channel.QueueBind("article.classified", "ausentinel.articles", "article.classified");
            _channel.QueueBind("article.indexed", "ausentinel.articles", "article.indexed");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to connect to RabbitMQ. Messages will not be published.");
            _connection = null!;
            _channel = null!;
        }
    }

    public void Publish<T>(string exchange, string routingKey, T message)
    {
        if (_channel == null) return;

        try
        {
            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = _channel.CreateBasicProperties();
            properties.Persistent = true;
            properties.ContentType = "application/json";

            _channel.BasicPublish(exchange, routingKey, properties, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish message to {Exchange}/{RoutingKey}", exchange, routingKey);
        }
    }

    public void Dispose()
    {
        _channel?.Dispose();
        _connection?.Dispose();
    }
}

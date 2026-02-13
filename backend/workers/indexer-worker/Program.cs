using AUSentinel.IndexerWorker;
using AUSentinel.Shared.Data;
using Microsoft.EntityFrameworkCore;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddSerilog();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

builder.Services.AddHttpClient("opensearch", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["OpenSearch:Url"] ?? "http://localhost:9200");
});

builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();

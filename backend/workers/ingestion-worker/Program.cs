using AUSentinel.IngestionWorker;
using AUSentinel.IngestionWorker.Services;
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

builder.Services.AddHttpClient<GdeltFetcher>();
builder.Services.AddHttpClient<RssFetcher>();
builder.Services.AddSingleton<ArticlePublisher>();
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();

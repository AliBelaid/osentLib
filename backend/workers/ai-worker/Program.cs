using AUSentinel.AiWorker;
using AUSentinel.AiWorker.Services;
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

builder.Services.AddSingleton<RuleBasedClassifier>();
builder.Services.AddHttpClient<LlmClassifier>();
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();

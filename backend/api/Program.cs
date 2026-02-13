using System.Text;
using AUSentinel.Api.Data;
using AUSentinel.Api.Middleware;
using AUSentinel.Api.Services;
using AUSentinel.Api.Validators;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// Database
var pgConn = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrEmpty(pgConn))
    pgConn = "Host=localhost;Database=ausentinel;Username=postgres;Password=postgres";
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(pgConn));

// Cache — use Redis if available, otherwise in-memory
var redisConn = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrEmpty(redisConn))
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = redisConn;
        options.InstanceName = "ausentinel:";
    });
}
else
{
    builder.Services.AddDistributedMemoryCache();
}

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "AU_Sentinel_Dev_Secret_Key_Change_In_Production_2024!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "AUSentinel",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "AUSentinel",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// FluentValidation
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();
builder.Services.AddFluentValidationAutoValidation();

// Services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddScoped<IVoteService, VoteService>();
builder.Services.AddScoped<IBulletinService, BulletinService>();
builder.Services.AddScoped<IAlertService, AlertService>();
builder.Services.AddScoped<ISourceService, SourceService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();
builder.Services.AddScoped<IBookmarkService, BookmarkService>();
builder.Services.AddScoped<IExperienceService, ExperienceService>();
builder.Services.AddScoped<ISavedSearchService, SavedSearchService>();
builder.Services.AddScoped<IKeywordListService, KeywordListService>();
builder.Services.AddScoped<ICsvParserService, CsvParserService>();
builder.Services.AddScoped<IImportService, ImportService>();
builder.Services.AddScoped<IDnsService, DnsService>();
builder.Services.AddScoped<IDomainWatchlistService, DomainWatchlistService>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.TwitterSearchProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.RedditSearchProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.NewsApiProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.IExternalSearchService, AUSentinel.Api.Services.ExternalSearch.ExternalSearchService>();
builder.Services.AddSingleton<QueryParser>();
builder.Services.AddSingleton<IOpenSearchService, OpenSearchService>();
builder.Services.AddSingleton<IRabbitMqService, RabbitMqService>();
builder.Services.AddHttpClient(); // For DNS geolocation API and external search providers

// Controllers
builder.Services.AddControllers();

// CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AU Sentinel API",
        Version = "v1",
        Description = "News monitoring and emergency alert platform for African Union member states"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Apply migrations and seed data
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    await SeedData.Initialize(db);
}
catch (Exception ex)
{
    Log.Warning(ex, "Could not apply migrations at startup. Ensure the database is running.");
}

app.UseMiddleware<GlobalExceptionHandler>();
app.UseSerilogRequestLogging();
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "AU Sentinel API v1"));

app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<CountryScopingMiddleware>();
app.UseMiddleware<AuditLogMiddleware>();

app.MapControllers();

Log.Information("AU Sentinel API starting on port 5000");
app.Run();

public partial class Program { }

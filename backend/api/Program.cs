using System.Text;
using AUSentinel.Api.Data;
using AUSentinel.Api.Hubs;
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

// Database — use PostgreSQL if available, otherwise fall back to InMemory
var pgConn = builder.Configuration.GetConnectionString("Postgres");
if (string.IsNullOrEmpty(pgConn))
    pgConn = "Host=localhost;Database=ausentinel;Username=postgres;Password=postgres";

bool useInMemory = false;
try
{
    using var testConn = new Npgsql.NpgsqlConnection(pgConn);
    testConn.Open();
    testConn.Close();
}
catch
{
    useInMemory = true;
}

if (useInMemory)
{
    Log.Warning("PostgreSQL not available — using InMemory database for development");
    builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase("AUSentinel"));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(pgConn));
}

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
        // SignalR passes the token via query string on WebSocket upgrade
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) &&
                    context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
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
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<IIntelReportService, IntelReportService>();
builder.Services.AddScoped<IIncidentService, IncidentService>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.TwitterSearchProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.RedditSearchProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.NewsApiProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.FacebookSearchProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.TelegramSearchProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.DarkWebSearchProvider>();
builder.Services.AddScoped<AUSentinel.Api.Services.ExternalSearch.IExternalSearchService, AUSentinel.Api.Services.ExternalSearch.ExternalSearchService>();
builder.Services.AddScoped<AUSentinel.Api.Services.IOsintToolsService, AUSentinel.Api.Services.OsintToolsService>();
builder.Services.AddSingleton<QueryParser>();
builder.Services.AddSingleton<IOpenSearchService, OpenSearchService>();
builder.Services.AddSingleton<IRabbitMqService, RabbitMqService>();
builder.Services.AddSingleton<GdeltFetcherService>();
builder.Services.AddSingleton<ReliefWebFetcherService>();
builder.Services.AddSingleton<AllAfricaFetcherService>();
builder.Services.AddSingleton<WhoOutbreakFetcherService>();
builder.Services.AddSingleton<UNNewsFetcherService>();
builder.Services.AddHttpClient(); // For DNS geolocation API and external search providers

// SignalR
builder.Services.AddSignalR();

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
    // Create new tables that EnsureCreated won't add to existing DBs
    await db.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS ""Incidents"" (
            ""Id"" uuid NOT NULL DEFAULT gen_random_uuid(),
            ""Title"" varchar(300) NOT NULL DEFAULT '',
            ""Description"" text NOT NULL DEFAULT '',
            ""Severity"" varchar(20) NOT NULL DEFAULT 'medium',
            ""Status"" varchar(30) NOT NULL DEFAULT 'open',
            ""Sector"" varchar(50) NOT NULL DEFAULT '',
            ""IncidentType"" varchar(50) NOT NULL DEFAULT '',
            ""CountryCode"" char(2) NOT NULL DEFAULT '',
            ""Source"" varchar(200),
            ""AffectedSystems"" text NOT NULL DEFAULT '[]',
            ""Iocs"" text NOT NULL DEFAULT '[]',
            ""AttachmentPath"" varchar(500),
            ""AttachmentName"" varchar(256),
            ""AttachmentContentType"" varchar(100),
            ""ContainmentPercent"" int NOT NULL DEFAULT 0,
            ""ReportedByUserId"" uuid NOT NULL,
            ""AssignedToUserId"" uuid,
            ""CreatedAt"" timestamptz NOT NULL DEFAULT now(),
            ""UpdatedAt"" timestamptz,
            ""ResolvedAt"" timestamptz,
            CONSTRAINT ""PK_Incidents"" PRIMARY KEY (""Id""),
            CONSTRAINT ""FK_Incidents_Countries"" FOREIGN KEY (""CountryCode"") REFERENCES ""Countries"" (""Code""),
            CONSTRAINT ""FK_Incidents_Users_Reported"" FOREIGN KEY (""ReportedByUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT,
            CONSTRAINT ""FK_Incidents_Users_Assigned"" FOREIGN KEY (""AssignedToUserId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS ""IX_Incidents_CountryCode"" ON ""Incidents"" (""CountryCode"");
        CREATE INDEX IF NOT EXISTS ""IX_Incidents_Status"" ON ""Incidents"" (""Status"");
        CREATE INDEX IF NOT EXISTS ""IX_Incidents_CreatedAt"" ON ""Incidents"" (""CreatedAt"");
    ");
    await SeedData.Initialize(db);
}
catch (Exception ex)
{
    Log.Warning(ex, "Could not apply migrations at startup. Ensure the database is running.");
}

// Fetch real OSINT data from all sources on startup (staggered)
// Helper to update source lastFetchedAt after successful fetch
async Task UpdateSourceTimestamp(IServiceProvider sp, string sourceName)
{
    try
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var source = await db.Sources.FirstOrDefaultAsync(s => s.Name == sourceName);
        if (source != null)
        {
            source.LastFetchedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }
    catch { /* non-critical */ }
}

_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(2000);
        var fetcher = app.Services.GetRequiredService<GdeltFetcherService>();
        await fetcher.FetchAsync();
        await UpdateSourceTimestamp(app.Services, "GDELT 2.1 DOC API");
    }
    catch (Exception ex) { Log.Warning(ex, "GDELT data fetch failed on startup"); }
});
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(6000);
        var fetcher = app.Services.GetRequiredService<ReliefWebFetcherService>();
        await fetcher.FetchAsync();
        await UpdateSourceTimestamp(app.Services, "ReliefWeb Africa");
    }
    catch (Exception ex) { Log.Warning(ex, "ReliefWeb data fetch failed on startup"); }
});
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(10000);
        var fetcher = app.Services.GetRequiredService<AllAfricaFetcherService>();
        await fetcher.FetchAsync();
        await UpdateSourceTimestamp(app.Services, "AllAfrica");
    }
    catch (Exception ex) { Log.Warning(ex, "AllAfrica data fetch failed on startup"); }
});
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(14000);
        var fetcher = app.Services.GetRequiredService<WhoOutbreakFetcherService>();
        await fetcher.FetchAsync();
        await UpdateSourceTimestamp(app.Services, "WHO Disease Outbreaks");
    }
    catch (Exception ex) { Log.Warning(ex, "WHO data fetch failed on startup"); }
});
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(18000);
        var fetcher = app.Services.GetRequiredService<UNNewsFetcherService>();
        await fetcher.FetchAsync();
        await UpdateSourceTimestamp(app.Services, "UN News");
    }
    catch (Exception ex) { Log.Warning(ex, "UN News data fetch failed on startup"); }
});

app.UseMiddleware<GlobalExceptionHandler>();
app.UseSerilogRequestLogging();
app.UseCors();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "AU Sentinel API v1"));

app.UseAuthentication();

// Dev auto-login: if no valid token, inject admin identity so [Authorize] passes
if (app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            var claims = new[]
            {
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "00000000-0000-0000-0000-000000000001"),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, "admin"),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "AUAdmin"),
                new System.Security.Claims.Claim("country", "ET"),
            };
            context.User = new System.Security.Claims.ClaimsPrincipal(
                new System.Security.Claims.ClaimsIdentity(claims, "DevAutoLogin"));
        }
        await next();
    });
}

app.UseAuthorization();
app.UseMiddleware<CountryScopingMiddleware>();
app.UseMiddleware<AuditLogMiddleware>();

app.MapControllers();
app.MapHub<IntelHub>("/hubs/intel");

var urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
if (string.IsNullOrEmpty(urls))
{
    Log.Information("AU Sentinel API starting on port 9099 (default)");
    app.Run("http://0.0.0.0:9099");
}
else
{
    Log.Information("AU Sentinel API starting on {Urls}", urls);
    app.Run();
}

public partial class Program { }

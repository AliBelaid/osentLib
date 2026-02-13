using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace AUSentinel.Api.Services;

public interface IImportService
{
    Task<ImportJob> CreateImportJobAsync(Guid userId, string fileName, string importType);
    Task<ImportJob?> GetImportJobAsync(int jobId, Guid userId);
    Task<List<ImportJob>> GetUserImportJobsAsync(Guid userId, int page = 1, int pageSize = 20);
    Task ProcessArticleImportAsync(int jobId);
    Task ProcessUserImportAsync(int jobId);
    Task ProcessSourceImportAsync(int jobId);
    Task ProcessKeywordListImportAsync(int jobId);
}

public class ImportService : IImportService
{
    private readonly AppDbContext _db;
    private readonly ICsvParserService _csvParser;
    private readonly ILogger<ImportService> _logger;
    private const int BatchSize = 1000;

    public ImportService(
        AppDbContext db,
        ICsvParserService csvParser,
        ILogger<ImportService> logger)
    {
        _db = db;
        _csvParser = csvParser;
        _logger = logger;
    }

    public async Task<ImportJob> CreateImportJobAsync(Guid userId, string fileName, string importType)
    {
        var job = new ImportJob
        {
            UserId = userId,
            FileName = fileName,
            ImportType = importType,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _db.ImportJobs.Add(job);
        await _db.SaveChangesAsync();

        return job;
    }

    public async Task<ImportJob?> GetImportJobAsync(int jobId, Guid userId)
    {
        return await _db.ImportJobs
            .Include(ij => ij.User)
            .FirstOrDefaultAsync(ij => ij.Id == jobId && ij.UserId == userId);
    }

    public async Task<List<ImportJob>> GetUserImportJobsAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        return await _db.ImportJobs
            .Where(ij => ij.UserId == userId)
            .OrderByDescending(ij => ij.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task ProcessArticleImportAsync(int jobId)
    {
        var job = await _db.ImportJobs.FindAsync(jobId);
        if (job == null || job.Status != "pending")
            return;

        try
        {
            job.Status = "processing";
            job.StartedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            // In a real implementation, we'd retrieve the file from storage
            // For now, assume the file is accessible at a known location
            var filePath = GetImportFilePath(job.FileName);

            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException($"Import file not found: {filePath}");
            }

            using var fileStream = File.OpenRead(filePath);
            var parseResult = await _csvParser.ParseArticlesAsync(fileStream);

            job.TotalRows = parseResult.TotalRows;
            job.ProcessedRows = 0;
            job.SuccessCount = 0;
            job.FailedCount = 0;

            var errorDetails = new List<string>();

            // Process in batches
            for (int i = 0; i < parseResult.Records.Count; i += BatchSize)
            {
                var batch = parseResult.Records.Skip(i).Take(BatchSize).ToList();

                foreach (var row in batch)
                {
                    try
                    {
                        await ProcessArticleRowAsync(row);
                        job.SuccessCount++;
                    }
                    catch (Exception ex)
                    {
                        job.FailedCount++;
                        errorDetails.Add($"Row {job.ProcessedRows + 1}: {ex.Message}");
                        _logger.LogWarning(ex, "Failed to import article row {Row}", job.ProcessedRows + 1);
                    }
                    finally
                    {
                        job.ProcessedRows++;
                    }
                }

                await _db.SaveChangesAsync();
            }

            // Add parse errors to error details
            foreach (var error in parseResult.Errors)
            {
                errorDetails.Add($"Row {error.RowNumber}: {error.ErrorMessage}");
            }

            job.Status = "completed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorDetails = errorDetails.Any() ? System.Text.Json.JsonSerializer.Serialize(errorDetails) : null;

            if (errorDetails.Any())
            {
                job.ErrorMessage = $"Completed with {errorDetails.Count} errors";
            }

            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process article import job {JobId}", jobId);
            job.Status = "failed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorMessage = ex.Message;
            await _db.SaveChangesAsync();
        }
    }

    public async Task ProcessUserImportAsync(int jobId)
    {
        var job = await _db.ImportJobs.FindAsync(jobId);
        if (job == null || job.Status != "pending")
            return;

        try
        {
            job.Status = "processing";
            job.StartedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var filePath = GetImportFilePath(job.FileName);
            using var fileStream = File.OpenRead(filePath);
            var parseResult = await _csvParser.ParseUsersAsync(fileStream);

            job.TotalRows = parseResult.TotalRows;
            job.ProcessedRows = 0;
            job.SuccessCount = 0;
            job.FailedCount = 0;

            var errorDetails = new List<string>();

            for (int i = 0; i < parseResult.Records.Count; i += BatchSize)
            {
                var batch = parseResult.Records.Skip(i).Take(BatchSize).ToList();

                foreach (var row in batch)
                {
                    try
                    {
                        await ProcessUserRowAsync(row);
                        job.SuccessCount++;
                    }
                    catch (Exception ex)
                    {
                        job.FailedCount++;
                        errorDetails.Add($"Row {job.ProcessedRows + 1}: {ex.Message}");
                        _logger.LogWarning(ex, "Failed to import user row {Row}", job.ProcessedRows + 1);
                    }
                    finally
                    {
                        job.ProcessedRows++;
                    }
                }

                await _db.SaveChangesAsync();
            }

            foreach (var error in parseResult.Errors)
            {
                errorDetails.Add($"Row {error.RowNumber}: {error.ErrorMessage}");
            }

            job.Status = "completed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorDetails = errorDetails.Any() ? System.Text.Json.JsonSerializer.Serialize(errorDetails) : null;

            if (errorDetails.Any())
            {
                job.ErrorMessage = $"Completed with {errorDetails.Count} errors";
            }

            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process user import job {JobId}", jobId);
            job.Status = "failed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorMessage = ex.Message;
            await _db.SaveChangesAsync();
        }
    }

    public async Task ProcessSourceImportAsync(int jobId)
    {
        var job = await _db.ImportJobs.FindAsync(jobId);
        if (job == null || job.Status != "pending")
            return;

        try
        {
            job.Status = "processing";
            job.StartedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var filePath = GetImportFilePath(job.FileName);
            using var fileStream = File.OpenRead(filePath);
            var parseResult = await _csvParser.ParseSourcesAsync(fileStream);

            job.TotalRows = parseResult.TotalRows;
            job.ProcessedRows = 0;
            job.SuccessCount = 0;
            job.FailedCount = 0;

            var errorDetails = new List<string>();

            for (int i = 0; i < parseResult.Records.Count; i += BatchSize)
            {
                var batch = parseResult.Records.Skip(i).Take(BatchSize).ToList();

                foreach (var row in batch)
                {
                    try
                    {
                        await ProcessSourceRowAsync(row);
                        job.SuccessCount++;
                    }
                    catch (Exception ex)
                    {
                        job.FailedCount++;
                        errorDetails.Add($"Row {job.ProcessedRows + 1}: {ex.Message}");
                        _logger.LogWarning(ex, "Failed to import source row {Row}", job.ProcessedRows + 1);
                    }
                    finally
                    {
                        job.ProcessedRows++;
                    }
                }

                await _db.SaveChangesAsync();
            }

            foreach (var error in parseResult.Errors)
            {
                errorDetails.Add($"Row {error.RowNumber}: {error.ErrorMessage}");
            }

            job.Status = "completed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorDetails = errorDetails.Any() ? System.Text.Json.JsonSerializer.Serialize(errorDetails) : null;

            if (errorDetails.Any())
            {
                job.ErrorMessage = $"Completed with {errorDetails.Count} errors";
            }

            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process source import job {JobId}", jobId);
            job.Status = "failed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorMessage = ex.Message;
            await _db.SaveChangesAsync();
        }
    }

    public async Task ProcessKeywordListImportAsync(int jobId)
    {
        var job = await _db.ImportJobs.FindAsync(jobId);
        if (job == null || job.Status != "pending")
            return;

        try
        {
            job.Status = "processing";
            job.StartedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var filePath = GetImportFilePath(job.FileName);
            using var fileStream = File.OpenRead(filePath);
            var parseResult = await _csvParser.ParseKeywordListsAsync(fileStream);

            job.TotalRows = parseResult.TotalRows;
            job.ProcessedRows = 0;
            job.SuccessCount = 0;
            job.FailedCount = 0;

            var errorDetails = new List<string>();

            for (int i = 0; i < parseResult.Records.Count; i += BatchSize)
            {
                var batch = parseResult.Records.Skip(i).Take(BatchSize).ToList();

                foreach (var row in batch)
                {
                    try
                    {
                        await ProcessKeywordListRowAsync(row, job.UserId);
                        job.SuccessCount++;
                    }
                    catch (Exception ex)
                    {
                        job.FailedCount++;
                        errorDetails.Add($"Row {job.ProcessedRows + 1}: {ex.Message}");
                        _logger.LogWarning(ex, "Failed to import keyword list row {Row}", job.ProcessedRows + 1);
                    }
                    finally
                    {
                        job.ProcessedRows++;
                    }
                }

                await _db.SaveChangesAsync();
            }

            foreach (var error in parseResult.Errors)
            {
                errorDetails.Add($"Row {error.RowNumber}: {error.ErrorMessage}");
            }

            job.Status = "completed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorDetails = errorDetails.Any() ? System.Text.Json.JsonSerializer.Serialize(errorDetails) : null;

            if (errorDetails.Any())
            {
                job.ErrorMessage = $"Completed with {errorDetails.Count} errors";
            }

            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process keyword list import job {JobId}", jobId);
            job.Status = "failed";
            job.CompletedAt = DateTime.UtcNow;
            job.ErrorMessage = ex.Message;
            await _db.SaveChangesAsync();
        }
    }

    private async Task ProcessArticleRowAsync(ArticleCsvRow row)
    {
        // Find or create source
        var source = await _db.Sources.FirstOrDefaultAsync(s => s.Name == row.SourceName);
        if (source == null)
        {
            throw new InvalidOperationException($"Source '{row.SourceName}' not found. Please import sources first.");
        }

        // Generate dedup hash
        var dedupHash = GenerateDedupHash(row.Title, row.Url);

        // Check if article already exists
        var existingArticle = await _db.Articles.FirstOrDefaultAsync(a => a.DedupHash == dedupHash);
        if (existingArticle != null)
        {
            throw new InvalidOperationException($"Article already exists with URL: {row.Url}");
        }

        // Create article
        var article = new Article
        {
            Title = row.Title,
            Url = row.Url,
            PublishedAt = row.PublishedAt,
            SourceId = source.Id,
            DedupHash = dedupHash,
            Body = row.Body ?? string.Empty,
            IngestedAt = DateTime.UtcNow,
            IsProcessed = true
        };

        _db.Articles.Add(article);
        await _db.SaveChangesAsync(); // Save to get article ID

        // Create classification
        var classification = new Classification
        {
            ArticleId = article.Id,
            Summary = row.Summary,
            Category = string.IsNullOrWhiteSpace(row.Category) ? "Uncategorized" : row.Category,
            ThreatLevel = row.ThreatLevel,
            CredibilityScore = 50, // Default credibility score
            ClassifiedAt = DateTime.UtcNow
        };

        _db.Classifications.Add(classification);

        // Add country tags if provided
        if (!string.IsNullOrWhiteSpace(row.CountryCodes))
        {
            var countryCodes = row.CountryCodes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var code in countryCodes)
            {
                var country = await _db.Countries.FindAsync(code);
                if (country != null)
                {
                    _db.ArticleCountryTags.Add(new ArticleCountryTag
                    {
                        ArticleId = article.Id,
                        CountryCode = code
                    });
                }
            }
        }
    }

    private async Task ProcessUserRowAsync(UserCsvRow row)
    {
        // Check if user already exists
        var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Username == row.Username || u.Email == row.Email);
        if (existingUser != null)
        {
            throw new InvalidOperationException($"User already exists with username '{row.Username}' or email '{row.Email}'");
        }

        // Verify country exists
        var country = await _db.Countries.FindAsync(row.CountryCode);
        if (country == null)
        {
            throw new InvalidOperationException($"Country code '{row.CountryCode}' not found");
        }

        // Generate a random password (user should reset on first login)
        var tempPassword = GenerateRandomPassword();

        var user = new User
        {
            Username = row.Username,
            Email = row.Email,
            FullName = row.FullName,
            CountryCode = row.CountryCode,
            IsActive = row.IsActive,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            PreferredLanguage = "en",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Assign role
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == row.Role);
        if (role != null)
        {
            _db.UserRoles.Add(new UserRole
            {
                UserId = user.Id,
                RoleId = role.Id,
                AssignedAt = DateTime.UtcNow
            });
        }

        _logger.LogInformation("Created user {Username} with temporary password: {Password}", row.Username, tempPassword);
    }

    private async Task ProcessSourceRowAsync(SourceCsvRow row)
    {
        // Check if source already exists
        var existingSource = await _db.Sources.FirstOrDefaultAsync(s => s.Url == row.Url);
        if (existingSource != null)
        {
            throw new InvalidOperationException($"Source already exists with URL: {row.Url}");
        }

        // Verify country exists
        var country = await _db.Countries.FindAsync(row.CountryCode);
        if (country == null)
        {
            throw new InvalidOperationException($"Country code '{row.CountryCode}' not found");
        }

        var source = new Source
        {
            Name = row.Name,
            Url = row.Url,
            CountryCode = row.CountryCode,
            Type = "Manual", // Manually imported source
            IsActive = row.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _db.Sources.Add(source);
    }

    private async Task ProcessKeywordListRowAsync(KeywordListCsvRow row, Guid userId)
    {
        // Check if keyword list with same name already exists for this user
        var existingList = await _db.KeywordLists.FirstOrDefaultAsync(kl => kl.UserId == userId && kl.Name == row.Name);
        if (existingList != null)
        {
            throw new InvalidOperationException($"Keyword list '{row.Name}' already exists");
        }

        var keywordList = new KeywordList
        {
            UserId = userId,
            Name = row.Name,
            Description = row.Description,
            Keywords = row.Keywords,
            Category = row.Category,
            IsPublic = row.IsPublic,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.KeywordLists.Add(keywordList);
    }

    private string GenerateDedupHash(string title, string url)
    {
        var content = $"{title}|{url}".ToLowerInvariant();
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private string GenerateRandomPassword()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 12)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    private string GetImportFilePath(string fileName)
    {
        // In production, this would retrieve from blob storage or a configured import directory
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "imports");
        Directory.CreateDirectory(uploadsPath);
        return Path.Combine(uploadsPath, fileName);
    }
}

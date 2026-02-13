using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ImportController : ControllerBase
{
    private readonly IImportService _importService;
    private readonly ILogger<ImportController> _logger;
    private const long MaxFileSize = 50 * 1024 * 1024; // 50 MB
    private static readonly string[] AllowedExtensions = { ".csv", ".txt" };

    public ImportController(
        IImportService importService,
        ILogger<ImportController> logger)
    {
        _importService = importService;
        _logger = logger;
    }

    [HttpPost("articles")]
    public async Task<IActionResult> ImportArticles(IFormFile file)
    {
        var validation = ValidateFile(file);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Error });

        var userId = GetUserId();
        var savedFileName = await SaveUploadedFileAsync(file);

        var job = await _importService.CreateImportJobAsync(userId, savedFileName, "articles");

        // Process asynchronously (in production, this would be queued to RabbitMQ)
        _ = Task.Run(async () =>
        {
            try
            {
                await _importService.ProcessArticleImportAsync(job.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process article import job {JobId}", job.Id);
            }
        });

        return Ok(new ImportJobDto
        {
            Id = job.Id,
            FileName = job.FileName,
            ImportType = job.ImportType,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ProcessedRows = job.ProcessedRows,
            SuccessCount = job.SuccessCount,
            FailedCount = job.FailedCount,
            ErrorMessage = job.ErrorMessage,
            CreatedAt = job.CreatedAt,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt
        });
    }

    [HttpPost("users")]
    [Authorize(Roles = "AUAdmin,CountryAdmin")]
    public async Task<IActionResult> ImportUsers(IFormFile file)
    {
        var validation = ValidateFile(file);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Error });

        var userId = GetUserId();
        var savedFileName = await SaveUploadedFileAsync(file);

        var job = await _importService.CreateImportJobAsync(userId, savedFileName, "users");

        _ = Task.Run(async () =>
        {
            try
            {
                await _importService.ProcessUserImportAsync(job.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process user import job {JobId}", job.Id);
            }
        });

        return Ok(new ImportJobDto
        {
            Id = job.Id,
            FileName = job.FileName,
            ImportType = job.ImportType,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ProcessedRows = job.ProcessedRows,
            SuccessCount = job.SuccessCount,
            FailedCount = job.FailedCount,
            ErrorMessage = job.ErrorMessage,
            CreatedAt = job.CreatedAt,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt
        });
    }

    [HttpPost("sources")]
    [Authorize(Roles = "AUAdmin,CountryAdmin")]
    public async Task<IActionResult> ImportSources(IFormFile file)
    {
        var validation = ValidateFile(file);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Error });

        var userId = GetUserId();
        var savedFileName = await SaveUploadedFileAsync(file);

        var job = await _importService.CreateImportJobAsync(userId, savedFileName, "sources");

        _ = Task.Run(async () =>
        {
            try
            {
                await _importService.ProcessSourceImportAsync(job.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process source import job {JobId}", job.Id);
            }
        });

        return Ok(new ImportJobDto
        {
            Id = job.Id,
            FileName = job.FileName,
            ImportType = job.ImportType,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ProcessedRows = job.ProcessedRows,
            SuccessCount = job.SuccessCount,
            FailedCount = job.FailedCount,
            ErrorMessage = job.ErrorMessage,
            CreatedAt = job.CreatedAt,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt
        });
    }

    [HttpPost("keywords")]
    public async Task<IActionResult> ImportKeywordLists(IFormFile file)
    {
        var validation = ValidateFile(file);
        if (!validation.IsValid)
            return BadRequest(new { error = validation.Error });

        var userId = GetUserId();
        var savedFileName = await SaveUploadedFileAsync(file);

        var job = await _importService.CreateImportJobAsync(userId, savedFileName, "keywords");

        _ = Task.Run(async () =>
        {
            try
            {
                await _importService.ProcessKeywordListImportAsync(job.Id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process keyword list import job {JobId}", job.Id);
            }
        });

        return Ok(new ImportJobDto
        {
            Id = job.Id,
            FileName = job.FileName,
            ImportType = job.ImportType,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ProcessedRows = job.ProcessedRows,
            SuccessCount = job.SuccessCount,
            FailedCount = job.FailedCount,
            ErrorMessage = job.ErrorMessage,
            CreatedAt = job.CreatedAt,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt
        });
    }

    [HttpGet("jobs/{jobId}")]
    public async Task<IActionResult> GetImportJob(int jobId)
    {
        var userId = GetUserId();
        var job = await _importService.GetImportJobAsync(jobId, userId);

        if (job == null)
            return NotFound(new { error = "Import job not found" });

        return Ok(new ImportJobDto
        {
            Id = job.Id,
            FileName = job.FileName,
            ImportType = job.ImportType,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ProcessedRows = job.ProcessedRows,
            SuccessCount = job.SuccessCount,
            FailedCount = job.FailedCount,
            ErrorMessage = job.ErrorMessage,
            ErrorDetails = job.ErrorDetails,
            CreatedAt = job.CreatedAt,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt,
            ProgressPercent = job.GetProgressPercent()
        });
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> GetMyImportJobs([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var jobs = await _importService.GetUserImportJobsAsync(userId, page, pageSize);

        var dtos = jobs.Select(job => new ImportJobDto
        {
            Id = job.Id,
            FileName = job.FileName,
            ImportType = job.ImportType,
            Status = job.Status,
            TotalRows = job.TotalRows,
            ProcessedRows = job.ProcessedRows,
            SuccessCount = job.SuccessCount,
            FailedCount = job.FailedCount,
            ErrorMessage = job.ErrorMessage,
            CreatedAt = job.CreatedAt,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt,
            ProgressPercent = job.GetProgressPercent()
        }).ToList();

        return Ok(dtos);
    }

    [HttpGet("template/{type}")]
    public IActionResult DownloadTemplate(string type)
    {
        var csv = type.ToLowerInvariant() switch
        {
            "articles" => GenerateArticleTemplate(),
            "users" => GenerateUserTemplate(),
            "sources" => GenerateSourceTemplate(),
            "keywords" => GenerateKeywordListTemplate(),
            _ => null
        };

        if (csv == null)
            return BadRequest(new { error = "Invalid template type" });

        var bytes = System.Text.Encoding.UTF8.GetBytes(csv);
        return File(bytes, "text/csv", $"{type}_template.csv");
    }

    private (bool IsValid, string? Error) ValidateFile(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return (false, "File is required");

        if (file.Length > MaxFileSize)
            return (false, $"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)} MB");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
            return (false, $"File type not allowed. Allowed types: {string.Join(", ", AllowedExtensions)}");

        return (true, null);
    }

    private async Task<string> SaveUploadedFileAsync(IFormFile file)
    {
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "imports");
        Directory.CreateDirectory(uploadsPath);

        var uniqueFileName = $"{Guid.NewGuid()}_{file.FileName}";
        var filePath = Path.Combine(uploadsPath, uniqueFileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return uniqueFileName;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    private string GenerateArticleTemplate()
    {
        return "Title,URL,Summary,Body,PublishedAt,SourceName,Category,ThreatLevel,CountryCodes\n" +
               "Sample Article,https://example.com/article,Brief summary,Full article text,2024-01-01T12:00:00Z,BBC News,Security,3,\"ET,KE\"";
    }

    private string GenerateUserTemplate()
    {
        return "Username,Email,FullName,CountryCode,Role,IsActive\n" +
               "john.doe,john.doe@example.com,John Doe,ET,User,true";
    }

    private string GenerateSourceTemplate()
    {
        return "Name,URL,Description,CountryCode,Category,IsActive,CredibilityScore\n" +
               "BBC News,https://www.bbc.com,British Broadcasting Corporation,GB,International,true,85";
    }

    private string GenerateKeywordListTemplate()
    {
        return "Name,Description,Keywords,Category,IsPublic\n" +
               "Security Terms,Common security keywords,\"terrorism,attack,threat,violence\",Security,false";
    }
}

// DTOs
public record ImportJobDto
{
    public int Id { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string ImportType { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public int TotalRows { get; init; }
    public int ProcessedRows { get; init; }
    public int SuccessCount { get; init; }
    public int FailedCount { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ErrorDetails { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public int ProgressPercent { get; init; }
}

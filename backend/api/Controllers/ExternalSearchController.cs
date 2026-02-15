using AUSentinel.Api.Services.ExternalSearch;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/external-search")]
[Authorize]
public class ExternalSearchController : ControllerBase
{
    private readonly IExternalSearchService _searchService;
    private readonly ILogger<ExternalSearchController> _logger;

    public ExternalSearchController(
        IExternalSearchService searchService,
        ILogger<ExternalSearchController> logger)
    {
        _searchService = searchService;
        _logger = logger;
    }

    [HttpPost("search")]
    public async Task<IActionResult> Search([FromBody] ExternalSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest(new { error = "Query is required" });

        if (string.IsNullOrWhiteSpace(request.Provider))
            return BadRequest(new { error = "Provider is required" });

        var userId = GetUserId();

        var result = await _searchService.SearchAsync(
            request.Provider,
            request.Query,
            request.Filters ?? new ExternalSearchFilters(),
            userId);

        if (!result.Success)
            return BadRequest(new { error = result.ErrorMessage ?? "Search failed" });

        return Ok(result);
    }

    [HttpPost("search/multi")]
    public async Task<IActionResult> SearchMultiple([FromBody] MultiProviderSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest(new { error = "Query is required" });

        if (request.Providers == null || !request.Providers.Any())
            return BadRequest(new { error = "At least one provider is required" });

        var userId = GetUserId();

        var results = await _searchService.SearchMultipleProvidersAsync(
            request.Providers,
            request.Query,
            request.Filters ?? new ExternalSearchFilters(),
            userId);

        return Ok(new
        {
            query = request.Query,
            providers = request.Providers,
            results,
            totalResults = results.Sum(r => r.TotalResults),
            successCount = results.Count(r => r.Success)
        });
    }

    [HttpGet("providers")]
    public IActionResult GetProviders()
    {
        var providers = _searchService.GetAvailableProviders();
        return Ok(providers);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var history = await _searchService.GetSearchHistoryAsync(userId, page, pageSize);
        return Ok(history);
    }

    [HttpGet("history/{id}")]
    public async Task<IActionResult> GetSearchById(int id)
    {
        var userId = GetUserId();
        var search = await _searchService.GetSearchByIdAsync(id, userId);

        if (search == null)
            return NotFound(new { error = "Search not found" });

        return Ok(search);
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }
}

// Request DTOs
public record ExternalSearchRequest
{
    public string Provider { get; init; } = string.Empty;
    public string Query { get; init; } = string.Empty;
    public ExternalSearchFilters? Filters { get; init; }
}

public record MultiProviderSearchRequest
{
    public List<string> Providers { get; init; } = new();
    public string Query { get; init; } = string.Empty;
    public ExternalSearchFilters? Filters { get; init; }
}

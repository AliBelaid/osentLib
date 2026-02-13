using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NewsController : ControllerBase
{
    private readonly INewsService _newsService;

    public NewsController(INewsService newsService) => _newsService = newsService;

    /// <summary>Search news articles with faceted filters</summary>
    [HttpGet]
    public async Task<ActionResult<NewsSearchResult>> Search([FromQuery] NewsSearchRequest request)
    {
        var countryScope = HttpContext.IsAUAdmin() ? null : HttpContext.GetUserCountryCode();
        var result = await _newsService.SearchAsync(request, countryScope);
        return Ok(result);
    }

    /// <summary>Get article detail by ID</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<NewsDetailDto>> GetDetail(Guid id)
    {
        var userId = HttpContext.GetUserId();
        var detail = await _newsService.GetDetailAsync(id, userId);
        if (detail == null) return NotFound();
        return Ok(detail);
    }

    /// <summary>Get trend data for dashboard</summary>
    [HttpGet("trends")]
    public async Task<ActionResult<TrendResult>> GetTrends([FromQuery] string period = "24h")
    {
        var country = HttpContext.IsAUAdmin() ? null : HttpContext.GetUserCountryCode();
        var result = await _newsService.GetTrendsAsync(country, period);
        return Ok(result);
    }

    /// <summary>Get top important/threat articles</summary>
    [HttpGet("important")]
    public async Task<ActionResult<List<NewsArticleDto>>> GetImportant([FromQuery] int count = 10)
    {
        var country = HttpContext.IsAUAdmin() ? null : HttpContext.GetUserCountryCode();
        var result = await _newsService.GetImportantAsync(country, count);
        return Ok(result);
    }
}

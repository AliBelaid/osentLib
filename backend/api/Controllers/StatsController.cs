using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class StatsController : ControllerBase
{
    private readonly IStatsService _statsService;

    public StatsController(IStatsService statsService) => _statsService = statsService;

    [HttpGet("countries")]
    public async Task<ActionResult<List<CountryStatsDto>>> GetCountryStats([FromQuery] string? region = null)
    {
        var result = await _statsService.GetCountryStatsAsync(region);
        return Ok(result);
    }

    [HttpGet("threats")]
    public async Task<ActionResult<List<ThreatActivityDto>>> GetThreatFeed([FromQuery] int limit = 50)
    {
        var result = await _statsService.GetThreatFeedAsync(limit);
        return Ok(result);
    }

    [HttpGet("timeline")]
    public async Task<ActionResult<List<TimelineBucketDto>>> GetTimeline(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] string granularity = "day")
    {
        var result = await _statsService.GetTimelineAsync(from, to, granularity);
        return Ok(result);
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetDashboardSummary(
        [FromQuery] string? category = null,
        [FromQuery] string? region = null,
        [FromQuery] string? period = null)
    {
        var result = await _statsService.GetDashboardSummaryAsync(category, region, period);
        return Ok(result);
    }
}

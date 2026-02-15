using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/osint")]
[Authorize]
public class OsintToolsController : ControllerBase
{
    private readonly IOsintToolsService _osint;
    private readonly ILogger<OsintToolsController> _logger;

    public OsintToolsController(IOsintToolsService osint, ILogger<OsintToolsController> logger)
    {
        _osint = osint;
        _logger = logger;
    }

    // ─── Email Breach Check ───
    [HttpPost("email-breach")]
    public async Task<IActionResult> CheckEmailBreach([FromBody] EmailBreachRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email is required" });

        var result = await _osint.CheckEmailBreaches(request.Email.Trim());
        return Ok(result);
    }

    // ─── Google Dorks ───
    [HttpPost("google-dorks")]
    public IActionResult GenerateGoogleDorks([FromBody] GoogleDorkRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Target))
            return BadRequest(new { error = "Target is required" });

        var result = _osint.GenerateGoogleDorks(request.Target.Trim(), request.Category ?? "all");
        return Ok(result);
    }

    // ─── Wayback Machine ───
    [HttpPost("wayback")]
    public async Task<IActionResult> GetWaybackSnapshots([FromBody] WaybackRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
            return BadRequest(new { error = "URL is required" });

        var result = await _osint.GetWaybackSnapshots(request.Url.Trim());
        return Ok(result);
    }

    // ─── Domain/IP Intelligence ───
    [HttpPost("domain-intel")]
    public async Task<IActionResult> GetDomainIntel([FromBody] DomainIntelRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Target))
            return BadRequest(new { error = "Target domain or IP is required" });

        var result = await _osint.GetDomainIntel(request.Target.Trim());
        return Ok(result);
    }

    // ─── SpiderFoot Scanner ───
    [HttpPost("spiderfoot")]
    public async Task<IActionResult> RunSpiderFootScan([FromBody] SpiderFootScanRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Target))
            return BadRequest(new { error = "Target is required" });

        var result = await _osint.RunSpiderFootScan(request.Target.Trim(), request.ScanType ?? "quick");
        return Ok(result);
    }

    // ─── Maltego Transform ───
    [HttpPost("maltego/transform")]
    public async Task<IActionResult> RunMaltegoTransform([FromBody] MaltegoTransformRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.EntityValue))
            return BadRequest(new { error = "Entity value is required" });

        var result = await _osint.RunMaltegoTransform(
            request.EntityType ?? "domain",
            request.EntityValue.Trim(),
            request.TransformType);
        return Ok(result);
    }
}

using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AlertController : ControllerBase
{
    private readonly IAlertService _alertService;

    public AlertController(IAlertService alertService) => _alertService = alertService;

    /// <summary>List alert rules (country-scoped)</summary>
    [HttpGet("rules")]
    public async Task<ActionResult<List<AlertRuleDto>>> ListRules()
    {
        var country = HttpContext.GetUserCountryCode();
        var isAdmin = HttpContext.IsAUAdmin();
        var result = await _alertService.ListRulesAsync(country, isAdmin);
        return Ok(result);
    }

    /// <summary>Create a new alert rule</summary>
    [HttpPost("rules")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<AlertRuleDto>> CreateRule([FromBody] CreateAlertRuleRequest request)
    {
        var userId = HttpContext.GetUserId();
        var country = HttpContext.GetUserCountryCode() ?? "";
        var result = await _alertService.CreateRuleAsync(userId, country, request);
        return Created($"/api/alert/rules", result);
    }

    /// <summary>Toggle an alert rule on/off</summary>
    [HttpPut("rules/{id:int}/toggle")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<AlertRuleDto>> ToggleRule(int id)
    {
        var result = await _alertService.ToggleRuleAsync(id);
        return Ok(result);
    }

    /// <summary>Delete an alert rule</summary>
    [HttpDelete("rules/{id:int}")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<IActionResult> DeleteRule(int id)
    {
        await _alertService.DeleteRuleAsync(id);
        return NoContent();
    }

    /// <summary>List alerts (country-scoped)</summary>
    [HttpGet]
    public async Task<ActionResult<List<AlertDto>>> ListAlerts([FromQuery] bool activeOnly = false)
    {
        var country = HttpContext.GetUserCountryCode();
        var isAdmin = HttpContext.IsAUAdmin();
        var result = await _alertService.ListAlertsAsync(country, isAdmin, activeOnly);
        return Ok(result);
    }

    /// <summary>Acknowledge an alert</summary>
    [HttpPost("{id:int}/acknowledge")]
    public async Task<IActionResult> Acknowledge(int id)
    {
        var userId = HttpContext.GetUserId();
        await _alertService.AcknowledgeAlertAsync(id, userId);
        return NoContent();
    }
}

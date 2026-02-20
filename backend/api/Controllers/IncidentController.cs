using AUSentinel.Api.Hubs;
using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IncidentController : ControllerBase
{
    private readonly IIncidentService _service;
    private readonly IHubContext<IntelHub> _hub;

    public IncidentController(IIncidentService service, IHubContext<IntelHub> hub)
    {
        _service = service;
        _hub = hub;
    }

    private Guid GetUserId() => HttpContext.GetUserId();
    private string? GetCountryCode() => HttpContext.GetUserCountryCode();
    private bool IsAdmin() => HttpContext.IsAUAdmin();

    /// <summary>List incidents with filters</summary>
    [HttpGet]
    public async Task<ActionResult<IncidentListResult>> List([FromQuery] IncidentListRequest request)
    {
        var result = await _service.ListAsync(request, GetCountryCode(), IsAdmin());
        return Ok(result);
    }

    /// <summary>Get incident stats for dashboard</summary>
    [HttpGet("stats")]
    public async Task<ActionResult<IncidentStatsDto>> GetStats()
    {
        var result = await _service.GetStatsAsync(GetCountryCode(), IsAdmin());
        return Ok(result);
    }

    /// <summary>Get single incident</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IncidentDto>> Get(Guid id)
    {
        var result = await _service.GetAsync(id);
        if (result == null) return NotFound();
        return Ok(result);
    }

    /// <summary>Create a new incident (any authenticated user)</summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<IncidentDto>> Create([FromForm] CreateIncidentRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title is required.");
        if (string.IsNullOrWhiteSpace(request.Sector))
            return BadRequest("Sector is required.");
        if (string.IsNullOrWhiteSpace(request.IncidentType))
            return BadRequest("IncidentType is required.");
        if (string.IsNullOrWhiteSpace(request.CountryCode))
            request.CountryCode = GetCountryCode() ?? "";

        var result = await _service.CreateAsync(GetUserId(), request, request.Attachment, _hub);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    /// <summary>Update an incident</summary>
    [HttpPut("{id:guid}")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<IncidentDto>> Update(Guid id, [FromForm] UpdateIncidentRequest request)
    {
        var result = await _service.UpdateAsync(id, GetUserId(), request, request.Attachment, _hub);
        return Ok(result);
    }

    /// <summary>Delete an incident (admin only)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }
}

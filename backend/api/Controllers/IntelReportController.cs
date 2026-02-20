using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IntelReportController : ControllerBase
{
    private readonly IIntelReportService _service;

    public IntelReportController(IIntelReportService service) => _service = service;

    /// <summary>List intelligence reports (paginated, filtered)</summary>
    [HttpGet]
    public async Task<ActionResult<IntelReportListResult>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? type = null)
    {
        var country = HttpContext.GetUserCountryCode();
        var isAdmin = HttpContext.IsAUAdmin();
        var result = await _service.ListAsync(page, pageSize, status, type, country, isAdmin);
        return Ok(result);
    }

    /// <summary>Get my intelligence reports</summary>
    [HttpGet("my")]
    public async Task<ActionResult<IntelReportListResult>> ListMy(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = HttpContext.GetUserId();
        var result = await _service.ListMyAsync(userId, page, pageSize);
        return Ok(result);
    }

    /// <summary>Get a single intelligence report</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IntelReportDto>> Get(Guid id)
    {
        var result = await _service.GetAsync(id);
        return Ok(result);
    }

    /// <summary>Create a new intelligence report</summary>
    [HttpPost]
    [Authorize(Roles = "DataEntry,Editor,CountryAdmin,AUAdmin")]
    public async Task<ActionResult<IntelReportDto>> Create([FromBody] CreateIntelReportRequest request)
    {
        var userId = HttpContext.GetUserId();
        var country = HttpContext.GetUserCountryCode() ?? "";
        var result = await _service.CreateAsync(userId, country, request);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    /// <summary>Update an intelligence report</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "DataEntry,Editor,CountryAdmin,AUAdmin")]
    public async Task<ActionResult<IntelReportDto>> Update(Guid id, [FromBody] UpdateIntelReportRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _service.UpdateAsync(id, userId, request);
        return Ok(result);
    }

    /// <summary>Change report status (active/closed)</summary>
    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = "DataEntry,Editor,CountryAdmin,AUAdmin")]
    public async Task<ActionResult<IntelReportDto>> UpdateStatus(Guid id, [FromBody] UpdateIntelReportStatusRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _service.UpdateStatusAsync(id, userId, request);
        return Ok(result);
    }

    /// <summary>Delete an intelligence report</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _service.DeleteAsync(id);
        return NoContent();
    }

    // --- Attachments ---

    /// <summary>Upload file attachment to report</summary>
    [HttpPost("{id:guid}/attachments")]
    [Authorize(Roles = "DataEntry,Editor,CountryAdmin,AUAdmin")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<IntelReportAttachmentDto>> UploadAttachment(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        var result = await _service.AddAttachmentAsync(id, file.FileName, file.ContentType, file.Length, file.OpenReadStream());
        return Ok(result);
    }

    /// <summary>Delete a report attachment</summary>
    [HttpDelete("{id:guid}/attachments/{aid:int}")]
    [Authorize(Roles = "DataEntry,Editor,CountryAdmin,AUAdmin")]
    public async Task<IActionResult> DeleteAttachment(Guid id, int aid)
    {
        await _service.DeleteAttachmentAsync(id, aid);
        return NoContent();
    }

    /// <summary>Download a report attachment</summary>
    [HttpGet("{id:guid}/attachments/{aid:int}/download")]
    public async Task<IActionResult> DownloadAttachment(Guid id, int aid)
    {
        var result = await _service.DownloadAttachmentAsync(id, aid);
        if (result == null)
            return NotFound("File not found on disk.");

        return File(result.Value.Stream, result.Value.ContentType, result.Value.FileName);
    }

    // --- Timeline ---

    /// <summary>Get timeline entries for a report</summary>
    [HttpGet("{id:guid}/timeline")]
    public async Task<ActionResult<List<IntelTimelineEntryDto>>> GetTimeline(Guid id)
    {
        var result = await _service.GetTimelineAsync(id);
        return Ok(result);
    }

    /// <summary>Add a comment/timeline entry</summary>
    [HttpPost("{id:guid}/timeline")]
    public async Task<ActionResult<IntelTimelineEntryDto>> AddTimelineEntry(Guid id, [FromBody] CreateTimelineEntryRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _service.AddTimelineEntryAsync(id, userId, request);
        return Ok(result);
    }

    /// <summary>Upload attachment to a timeline entry</summary>
    [HttpPost("{id:guid}/timeline/{eid:int}/attachments")]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<ActionResult<IntelTimelineAttachmentDto>> UploadTimelineAttachment(Guid id, int eid, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        var result = await _service.AddTimelineAttachmentAsync(id, eid, file.FileName, file.ContentType, file.Length, file.OpenReadStream());
        return Ok(result);
    }

    // --- Links ---

    /// <summary>Get linked reports</summary>
    [HttpGet("{id:guid}/links")]
    public async Task<ActionResult<List<IntelReportLinkDto>>> GetLinks(Guid id)
    {
        var result = await _service.GetLinksAsync(id);
        return Ok(result);
    }

    /// <summary>Link two reports together</summary>
    [HttpPost("{id:guid}/links")]
    [Authorize(Roles = "DataEntry,Editor,CountryAdmin,AUAdmin")]
    public async Task<ActionResult<IntelReportLinkDto>> CreateLink(Guid id, [FromBody] CreateIntelReportLinkRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _service.CreateLinkAsync(id, userId, request);
        return Ok(result);
    }

    /// <summary>Remove a link between reports</summary>
    [HttpDelete("{id:guid}/links/{lid:int}")]
    [Authorize(Roles = "DataEntry,Editor,CountryAdmin,AUAdmin")]
    public async Task<IActionResult> DeleteLink(Guid id, int lid)
    {
        await _service.DeleteLinkAsync(id, lid);
        return NoContent();
    }
}

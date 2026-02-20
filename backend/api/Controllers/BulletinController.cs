using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
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
public class BulletinController : ControllerBase
{
    private readonly IBulletinService _bulletinService;
    private readonly AppDbContext _db;
    private readonly IHubContext<IntelHub> _hub;
    private readonly IWebHostEnvironment _env;

    public BulletinController(IBulletinService bulletinService, AppDbContext db, IHubContext<IntelHub> hub, IWebHostEnvironment env)
    {
        _bulletinService = bulletinService;
        _db = db;
        _hub = hub;
        _env = env;
    }

    /// <summary>List bulletins (country-scoped)</summary>
    [HttpGet]
    public async Task<ActionResult<List<BulletinDto>>> List()
    {
        var country = HttpContext.GetUserCountryCode();
        var isAdmin = HttpContext.IsAUAdmin();
        var result = await _bulletinService.ListAsync(country, isAdmin);
        return Ok(result);
    }

    /// <summary>Get a single bulletin</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BulletinDto>> Get(Guid id)
    {
        var result = await _bulletinService.GetAsync(id);
        return Ok(result);
    }

    /// <summary>Submit a report (any authenticated user) — accepts multipart/form-data for optional file attachment</summary>
    [HttpPost("report")]
    [Consumes("multipart/form-data", "application/json")]
    public async Task<ActionResult<BulletinDto>> SubmitReport([FromForm] SubmitReportFormRequest request)
    {
        var userId = HttpContext.GetUserId();
        var country = HttpContext.GetUserCountryCode() ?? "";
        var bulletinRequest = new CreateBulletinRequest(
            request.Title,
            request.Content,
            request.Urgency,
            request.ReportType
        );
        var result = await _bulletinService.CreateAsync(userId, country, bulletinRequest);

        // Save optional file attachment
        if (request.Attachment != null && request.Attachment.Length > 0)
        {
            var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "reports");
            Directory.CreateDirectory(uploadsDir);
            var ext = Path.GetExtension(request.Attachment.FileName);
            var fileName = $"{result.Id}{ext}";
            var filePath = Path.Combine(uploadsDir, fileName);
            await using var stream = System.IO.File.Create(filePath);
            await request.Attachment.CopyToAsync(stream);

            var attachment = new BulletinAttachment
            {
                BulletinId = result.Id,
                FileName = request.Attachment.FileName,
                StoragePath = $"/uploads/reports/{fileName}",
                ContentType = request.Attachment.ContentType,
                SizeBytes = request.Attachment.Length
            };
            _db.BulletinAttachments.Add(attachment);
            await _db.SaveChangesAsync();
        }

        // Auto-submit for review
        await _bulletinService.SubmitForReviewAsync(result.Id, userId);
        var updated = await _bulletinService.GetAsync(result.Id);

        // Notify ALL connected users in real time
        await _hub.Clients.All.SendAsync("ReportSubmitted", new
        {
            reportId = updated.Id,
            title = updated.Title,
            country = updated.CountryCode,
            urgency = request.Urgency,
            reportType = request.ReportType,
            submittedBy = updated.CreatedByName
        });

        return CreatedAtAction(nameof(Get), new { id = updated.Id }, updated);
    }

    /// <summary>Create a new bulletin draft</summary>
    [HttpPost]
    [Authorize(Roles = "Editor,CountryAdmin,AUAdmin")]
    public async Task<ActionResult<BulletinDto>> Create([FromBody] CreateBulletinRequest request)
    {
        var userId = HttpContext.GetUserId();
        var country = HttpContext.GetUserCountryCode() ?? "";
        var result = await _bulletinService.CreateAsync(userId, country, request);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    /// <summary>Update a bulletin draft</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Editor,CountryAdmin,AUAdmin")]
    public async Task<ActionResult<BulletinDto>> Update(Guid id, [FromBody] UpdateBulletinRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _bulletinService.UpdateAsync(id, userId, request);
        return Ok(result);
    }

    /// <summary>Submit a bulletin for review</summary>
    [HttpPost("{id:guid}/submit")]
    [Authorize(Roles = "Editor,CountryAdmin,AUAdmin")]
    public async Task<ActionResult<BulletinDto>> SubmitForReview(Guid id)
    {
        var userId = HttpContext.GetUserId();
        var result = await _bulletinService.SubmitForReviewAsync(id, userId);
        return Ok(result);
    }

    /// <summary>Publish a bulletin</summary>
    [HttpPost("{id:guid}/publish")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<BulletinDto>> Publish(Guid id)
    {
        var userId = HttpContext.GetUserId();
        var result = await _bulletinService.PublishAsync(id, userId);
        return Ok(result);
    }

    /// <summary>Delete a bulletin</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _bulletinService.DeleteAsync(id);
        return NoContent();
    }
}

using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BulletinController : ControllerBase
{
    private readonly IBulletinService _bulletinService;

    public BulletinController(IBulletinService bulletinService) => _bulletinService = bulletinService;

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

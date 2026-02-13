using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "AUAdmin")]
public class SourceController : ControllerBase
{
    private readonly ISourceService _sourceService;

    public SourceController(ISourceService sourceService) => _sourceService = sourceService;

    /// <summary>List all news sources</summary>
    [HttpGet]
    public async Task<ActionResult<List<SourceDto>>> List()
    {
        var result = await _sourceService.ListAsync();
        return Ok(result);
    }

    /// <summary>Create a new source</summary>
    [HttpPost]
    public async Task<ActionResult<SourceDto>> Create([FromBody] CreateSourceRequest request)
    {
        var result = await _sourceService.CreateAsync(request);
        return Created($"/api/source/{result.Id}", result);
    }

    /// <summary>Toggle a source active/inactive</summary>
    [HttpPut("{id:int}/toggle")]
    public async Task<ActionResult<SourceDto>> Toggle(int id)
    {
        var result = await _sourceService.ToggleAsync(id);
        return Ok(result);
    }

    /// <summary>Delete a source</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _sourceService.DeleteAsync(id);
        return NoContent();
    }
}

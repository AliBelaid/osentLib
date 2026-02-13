using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BookmarkController : ControllerBase
{
    private readonly IBookmarkService _bookmarkService;

    public BookmarkController(IBookmarkService bookmarkService) => _bookmarkService = bookmarkService;

    /// <summary>Add a bookmark</summary>
    [HttpPost]
    public async Task<ActionResult<BookmarkDto>> AddBookmark([FromBody] CreateBookmarkRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _bookmarkService.AddBookmarkAsync(userId, request);
        return Ok(result);
    }

    /// <summary>Remove a bookmark</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> RemoveBookmark(int id)
    {
        var userId = HttpContext.GetUserId();
        await _bookmarkService.RemoveBookmarkAsync(id, userId);
        return NoContent();
    }

    /// <summary>List bookmarks</summary>
    [HttpGet]
    public async Task<ActionResult<BookmarkListResult>> ListBookmarks(
        [FromQuery] int? collectionId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = HttpContext.GetUserId();
        var result = await _bookmarkService.ListBookmarksAsync(userId, collectionId, page, pageSize);
        return Ok(result);
    }

    /// <summary>Get bookmark collections</summary>
    [HttpGet("collections")]
    public async Task<ActionResult<List<BookmarkCollectionDto>>> GetCollections()
    {
        var userId = HttpContext.GetUserId();
        var result = await _bookmarkService.GetCollectionsAsync(userId);
        return Ok(result);
    }

    /// <summary>Create a collection</summary>
    [HttpPost("collections")]
    public async Task<ActionResult<BookmarkCollectionDto>> CreateCollection([FromBody] CreateCollectionRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _bookmarkService.CreateCollectionAsync(userId, request);
        return CreatedAtAction(nameof(GetCollections), new { }, result);
    }

    /// <summary>Update a collection</summary>
    [HttpPut("collections/{id:int}")]
    public async Task<ActionResult<BookmarkCollectionDto>> UpdateCollection(int id, [FromBody] UpdateCollectionRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _bookmarkService.UpdateCollectionAsync(id, userId, request);
        return Ok(result);
    }

    /// <summary>Delete a collection</summary>
    [HttpDelete("collections/{id:int}")]
    public async Task<IActionResult> DeleteCollection(int id)
    {
        var userId = HttpContext.GetUserId();
        await _bookmarkService.DeleteCollectionAsync(id, userId);
        return NoContent();
    }
}

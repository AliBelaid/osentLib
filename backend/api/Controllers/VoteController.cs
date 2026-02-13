using AUSentinel.Api.Middleware;
using AUSentinel.Api.Models;
using AUSentinel.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VoteController : ControllerBase
{
    private readonly IVoteService _voteService;

    public VoteController(IVoteService voteService) => _voteService = voteService;

    /// <summary>Cast or update a vote on an article</summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<VoteDto>> CastVote([FromBody] CastVoteRequest request)
    {
        var userId = HttpContext.GetUserId();
        var result = await _voteService.CastVoteAsync(userId, request);
        return Ok(result);
    }

    /// <summary>Remove a vote from an article</summary>
    [HttpDelete("{articleId:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteVote(Guid articleId)
    {
        var userId = HttpContext.GetUserId();
        await _voteService.DeleteVoteAsync(userId, articleId);
        return NoContent();
    }

    /// <summary>Get vote statistics for an article</summary>
    [HttpGet("{articleId:guid}/stats")]
    [Authorize]
    public async Task<ActionResult<VoteStatsDto>> GetStats(Guid articleId)
    {
        var stats = await _voteService.GetStatsAsync(articleId);
        return Ok(stats);
    }
}

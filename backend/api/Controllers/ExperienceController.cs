using AUSentinel.Api.Services;
using AUSentinel.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExperienceController : ControllerBase
{
    private readonly IExperienceService _experienceService;
    private readonly ILogger<ExperienceController> _logger;

    public ExperienceController(IExperienceService experienceService, ILogger<ExperienceController> logger)
    {
        _experienceService = experienceService;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    private string? GetUserCountry() => User.FindFirst("CountryCode")?.Value;
    private bool IsAUAdmin() => User.IsInRole("AUAdmin");

    /// <summary>
    /// Get current user's XP and level information
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<UserExperienceDto>> GetMyExperience()
    {
        var userId = GetUserId();
        var experience = await _experienceService.GetUserExperienceAsync(userId);
        return Ok(experience);
    }

    /// <summary>
    /// Get specific user's XP and level (for profile viewing)
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    public async Task<ActionResult<UserExperienceDto>> GetUserExperience(Guid userId)
    {
        var experience = await _experienceService.GetUserExperienceAsync(userId);
        return Ok(experience);
    }

    /// <summary>
    /// Get leaderboard (top users by XP)
    /// </summary>
    [HttpGet("leaderboard")]
    public async Task<ActionResult<List<LeaderboardEntryDto>>> GetLeaderboard(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? countryCode = null)
    {
        // If countryCode is not specified and user is not AU Admin, filter by their country
        if (string.IsNullOrEmpty(countryCode) && !IsAUAdmin())
        {
            countryCode = GetUserCountry();
        }

        var leaderboard = await _experienceService.GetLeaderboardAsync(page, pageSize, countryCode);
        return Ok(leaderboard);
    }

    /// <summary>
    /// Get current user's earned badges
    /// </summary>
    [HttpGet("badges/me")]
    public async Task<ActionResult<List<UserBadgeDto>>> GetMyBadges()
    {
        var userId = GetUserId();
        var badges = await _experienceService.GetUserBadgesAsync(userId);
        return Ok(badges);
    }

    /// <summary>
    /// Get specific user's earned badges (for profile viewing)
    /// </summary>
    [HttpGet("badges/user/{userId:guid}")]
    public async Task<ActionResult<List<UserBadgeDto>>> GetUserBadges(Guid userId)
    {
        var badges = await _experienceService.GetUserBadgesAsync(userId);
        return Ok(badges);
    }

    /// <summary>
    /// Get all available badges (catalog)
    /// </summary>
    [HttpGet("badges/all")]
    public async Task<ActionResult<List<BadgeDto>>> GetAllBadges()
    {
        var badges = await _experienceService.GetAllBadgesAsync();
        return Ok(badges);
    }

    /// <summary>
    /// Get current user's activity history
    /// </summary>
    [HttpGet("activity/me")]
    public async Task<ActionResult<ActivityHistoryResult>> GetMyActivity(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = GetUserId();
        var history = await _experienceService.GetActivityHistoryAsync(userId, page, pageSize);
        return Ok(history);
    }

    /// <summary>
    /// Get specific user's activity history (for admins)
    /// </summary>
    [HttpGet("activity/user/{userId:guid}")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<ActivityHistoryResult>> GetUserActivity(
        Guid userId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var history = await _experienceService.GetActivityHistoryAsync(userId, page, pageSize);
        return Ok(history);
    }

    /// <summary>
    /// Manually check and unlock badges (useful after bulk operations)
    /// </summary>
    [HttpPost("badges/check")]
    public async Task<ActionResult<List<BadgeDto>>> CheckBadges()
    {
        var userId = GetUserId();
        var newlyUnlocked = await _experienceService.CheckAndUnlockBadgesAsync(userId);

        if (newlyUnlocked.Any())
        {
            _logger.LogInformation("User {UserId} unlocked {Count} new badges", userId, newlyUnlocked.Count);
        }

        return Ok(new { newlyUnlocked });
    }

    /// <summary>
    /// Admin endpoint to manually award XP (for special achievements, events, etc.)
    /// </summary>
    [HttpPost("award")]
    [Authorize(Roles = "CountryAdmin,AUAdmin")]
    public async Task<ActionResult<UserExperienceDto>> AwardXp(
        [FromBody] AwardXpRequest request,
        [FromQuery] Guid targetUserId)
    {
        var adminUserId = GetUserId();
        var xpAmount = request.CustomXpAmount ?? ExperienceService.GetXpForActivity(request.ActivityType);

        if (xpAmount <= 0)
        {
            return BadRequest("Invalid XP amount");
        }

        var experience = await _experienceService.AwardXpAsync(
            targetUserId,
            request.ActivityType,
            xpAmount,
            request.EntityType,
            request.EntityId,
            request.Metadata
        );

        _logger.LogInformation(
            "Admin {AdminId} manually awarded {Xp} XP to user {UserId} for {Activity}",
            adminUserId, xpAmount, targetUserId, request.ActivityType
        );

        return Ok(experience);
    }
}

using AUSentinel.Api.Models;

namespace AUSentinel.Api.Services;

public interface IExperienceService
{
    /// <summary>
    /// Awards XP to a user for an activity and updates their level
    /// </summary>
    Task<UserExperienceDto> AwardXpAsync(Guid userId, string activityType, int xpAmount, string? entityType = null, Guid? entityId = null, string? metadata = null);

    /// <summary>
    /// Gets user's current XP and level information
    /// </summary>
    Task<UserExperienceDto> GetUserExperienceAsync(Guid userId);

    /// <summary>
    /// Gets leaderboard of top users by XP
    /// </summary>
    Task<List<LeaderboardEntryDto>> GetLeaderboardAsync(int page = 1, int pageSize = 50, string? countryCode = null);

    /// <summary>
    /// Gets user's earned badges
    /// </summary>
    Task<List<UserBadgeDto>> GetUserBadgesAsync(Guid userId);

    /// <summary>
    /// Gets all available badges
    /// </summary>
    Task<List<BadgeDto>> GetAllBadgesAsync();

    /// <summary>
    /// Gets user's activity history
    /// </summary>
    Task<ActivityHistoryResult> GetActivityHistoryAsync(Guid userId, int page = 1, int pageSize = 20);

    /// <summary>
    /// Checks and unlocks badges for a user based on their activities
    /// </summary>
    Task<List<BadgeDto>> CheckAndUnlockBadgesAsync(Guid userId);
}

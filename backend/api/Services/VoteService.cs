using AUSentinel.Api.Data;
using AUSentinel.Api.Data.Entities;
using AUSentinel.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Services;

public interface IVoteService
{
    Task<VoteDto> CastVoteAsync(Guid userId, CastVoteRequest request);
    Task DeleteVoteAsync(Guid userId, Guid articleId);
    Task<VoteStatsDto> GetStatsAsync(Guid articleId);
}

public class VoteService : IVoteService
{
    private readonly AppDbContext _db;
    private readonly IExperienceService _experienceService;

    public VoteService(AppDbContext db, IExperienceService experienceService)
    {
        _db = db;
        _experienceService = experienceService;
    }

    public async Task<VoteDto> CastVoteAsync(Guid userId, CastVoteRequest request)
    {
        var existing = await _db.Votes
            .FirstOrDefaultAsync(v => v.ArticleId == request.ArticleId && v.UserId == userId);

        if (existing != null)
        {
            // Update existing vote
            existing.VoteType = request.VoteType;
            existing.Reason = request.Reason;
            existing.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return new VoteDto(existing.Id, existing.ArticleId, existing.VoteType,
                existing.Reason, existing.CreatedAt, existing.UpdatedAt);
        }

        var vote = new Vote
        {
            ArticleId = request.ArticleId,
            UserId = userId,
            VoteType = request.VoteType,
            Reason = request.Reason
        };

        _db.Votes.Add(vote);
        await _db.SaveChangesAsync();

        // Award XP for voting (only for new votes, not updates)
        await _experienceService.AwardXpAsync(
            userId,
            "vote",
            ExperienceService.GetXpForActivity("vote"),
            "Article",
            request.ArticleId
        );

        return new VoteDto(vote.Id, vote.ArticleId, vote.VoteType,
            vote.Reason, vote.CreatedAt, vote.UpdatedAt);
    }

    public async Task DeleteVoteAsync(Guid userId, Guid articleId)
    {
        var vote = await _db.Votes
            .FirstOrDefaultAsync(v => v.ArticleId == articleId && v.UserId == userId)
            ?? throw new KeyNotFoundException("Vote not found.");

        _db.Votes.Remove(vote);
        await _db.SaveChangesAsync();
    }

    public async Task<VoteStatsDto> GetStatsAsync(Guid articleId)
    {
        var votes = await _db.Votes.Where(v => v.ArticleId == articleId).ToListAsync();

        return new VoteStatsDto(
            votes.Count(v => v.VoteType == "REAL"),
            votes.Count(v => v.VoteType == "MISLEADING"),
            votes.Count(v => v.VoteType == "UNSURE")
        );
    }
}

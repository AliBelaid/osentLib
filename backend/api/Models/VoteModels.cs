namespace AUSentinel.Api.Models;

public record CastVoteRequest(
    Guid ArticleId,
    string VoteType,  // REAL, MISLEADING, UNSURE
    string? Reason
);

public record VoteDto(
    int Id,
    Guid ArticleId,
    string VoteType,
    string? Reason,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

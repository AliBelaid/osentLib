using AUSentinel.Api.Models;

namespace AUSentinel.Api.Services;

public interface IKeywordListService
{
    Task<List<KeywordListDto>> ListAsync(Guid userId, bool includePublic = false);
    Task<KeywordListDto> GetAsync(int id, Guid userId);
    Task<KeywordListDto> CreateAsync(Guid userId, CreateKeywordListRequest request);
    Task<KeywordListDto> UpdateAsync(int id, Guid userId, UpdateKeywordListRequest request);
    Task DeleteAsync(int id, Guid userId);
    Task<KeywordListDto> IncrementUsageAsync(int id, Guid userId);
}

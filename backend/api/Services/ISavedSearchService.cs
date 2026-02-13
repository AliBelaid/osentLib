using AUSentinel.Api.Models;

namespace AUSentinel.Api.Services;

public interface ISavedSearchService
{
    Task<List<SavedSearchDto>> ListAsync(Guid userId, bool includePublic = false);
    Task<SavedSearchDto> GetAsync(int id, Guid userId);
    Task<SavedSearchDto> CreateAsync(Guid userId, CreateSavedSearchRequest request);
    Task<SavedSearchDto> UpdateAsync(int id, Guid userId, UpdateSavedSearchRequest request);
    Task DeleteAsync(int id, Guid userId);
    Task<SavedSearchDto> ExecuteAsync(int id, Guid userId);
}

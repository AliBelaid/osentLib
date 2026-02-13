using AUSentinel.Api.Services;
using AUSentinel.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AUSentinel.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISavedSearchService _savedSearchService;
    private readonly IKeywordListService _keywordListService;
    private readonly QueryParser _queryParser;

    public SearchController(
        ISavedSearchService savedSearchService,
        IKeywordListService keywordListService,
        QueryParser queryParser)
    {
        _savedSearchService = savedSearchService;
        _keywordListService = keywordListService;
        _queryParser = queryParser;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    #region Saved Searches

    /// <summary>
    /// List user's saved searches
    /// </summary>
    [HttpGet("saved")]
    public async Task<ActionResult<List<SavedSearchDto>>> ListSavedSearches([FromQuery] bool includePublic = false)
    {
        var userId = GetUserId();
        var searches = await _savedSearchService.ListAsync(userId, includePublic);
        return Ok(searches);
    }

    /// <summary>
    /// Get specific saved search
    /// </summary>
    [HttpGet("saved/{id}")]
    public async Task<ActionResult<SavedSearchDto>> GetSavedSearch(int id)
    {
        var userId = GetUserId();
        var search = await _savedSearchService.GetAsync(id, userId);
        return Ok(search);
    }

    /// <summary>
    /// Create new saved search
    /// </summary>
    [HttpPost("saved")]
    public async Task<ActionResult<SavedSearchDto>> CreateSavedSearch([FromBody] CreateSavedSearchRequest request)
    {
        var userId = GetUserId();
        var search = await _savedSearchService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetSavedSearch), new { id = search.Id }, search);
    }

    /// <summary>
    /// Update saved search
    /// </summary>
    [HttpPut("saved/{id}")]
    public async Task<ActionResult<SavedSearchDto>> UpdateSavedSearch(int id, [FromBody] UpdateSavedSearchRequest request)
    {
        var userId = GetUserId();
        var search = await _savedSearchService.UpdateAsync(id, userId, request);
        return Ok(search);
    }

    /// <summary>
    /// Delete saved search
    /// </summary>
    [HttpDelete("saved/{id}")]
    public async Task<IActionResult> DeleteSavedSearch(int id)
    {
        var userId = GetUserId();
        await _savedSearchService.DeleteAsync(id, userId);
        return NoContent();
    }

    /// <summary>
    /// Execute saved search (increments execution counter)
    /// </summary>
    [HttpPost("saved/{id}/execute")]
    public async Task<ActionResult<SavedSearchDto>> ExecuteSavedSearch(int id)
    {
        var userId = GetUserId();
        var search = await _savedSearchService.ExecuteAsync(id, userId);
        return Ok(search);
    }

    #endregion

    #region Keyword Lists

    /// <summary>
    /// List user's keyword lists
    /// </summary>
    [HttpGet("keywords")]
    public async Task<ActionResult<List<KeywordListDto>>> ListKeywordLists([FromQuery] bool includePublic = false)
    {
        var userId = GetUserId();
        var lists = await _keywordListService.ListAsync(userId, includePublic);
        return Ok(lists);
    }

    /// <summary>
    /// Get specific keyword list
    /// </summary>
    [HttpGet("keywords/{id}")]
    public async Task<ActionResult<KeywordListDto>> GetKeywordList(int id)
    {
        var userId = GetUserId();
        var list = await _keywordListService.GetAsync(id, userId);
        return Ok(list);
    }

    /// <summary>
    /// Create new keyword list
    /// </summary>
    [HttpPost("keywords")]
    public async Task<ActionResult<KeywordListDto>> CreateKeywordList([FromBody] CreateKeywordListRequest request)
    {
        var userId = GetUserId();
        var list = await _keywordListService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetKeywordList), new { id = list.Id }, list);
    }

    /// <summary>
    /// Update keyword list
    /// </summary>
    [HttpPut("keywords/{id}")]
    public async Task<ActionResult<KeywordListDto>> UpdateKeywordList(int id, [FromBody] UpdateKeywordListRequest request)
    {
        var userId = GetUserId();
        var list = await _keywordListService.UpdateAsync(id, userId, request);
        return Ok(list);
    }

    /// <summary>
    /// Delete keyword list
    /// </summary>
    [HttpDelete("keywords/{id}")]
    public async Task<IActionResult> DeleteKeywordList(int id)
    {
        var userId = GetUserId();
        await _keywordListService.DeleteAsync(id, userId);
        return NoContent();
    }

    /// <summary>
    /// Increment keyword list usage count
    /// </summary>
    [HttpPost("keywords/{id}/use")]
    public async Task<ActionResult<KeywordListDto>> UseKeywordList(int id)
    {
        var userId = GetUserId();
        var list = await _keywordListService.IncrementUsageAsync(id, userId);
        return Ok(list);
    }

    #endregion

    #region Query Parsing

    /// <summary>
    /// Parse and validate advanced search query
    /// </summary>
    [HttpPost("parse")]
    public ActionResult<ParseQueryResponse> ParseQuery([FromBody] ParseQueryRequest request)
    {
        // Validate query
        var (isValid, validationError) = _queryParser.ValidateQuery(request.Query);

        if (!isValid)
        {
            return Ok(new ParseQueryResponse(
                request.Query,
                false,
                validationError,
                false,
                string.Empty,
                new Dictionary<string, List<string>>(),
                new List<string>(),
                new List<string>()
            ));
        }

        // Parse query
        var parsed = _queryParser.Parse(request.Query);
        var openSearchQuery = _queryParser.BuildOpenSearchQuery(parsed);

        // Extract simple terms for response
        var terms = parsed.Tokens
            .Where(t => t.Type == TokenType.Term)
            .Select(t => t.Value)
            .ToList();

        return Ok(new ParseQueryResponse(
            request.Query,
            true,
            null,
            parsed.HasAdvancedSyntax,
            openSearchQuery,
            parsed.FieldSearches,
            parsed.Phrases,
            terms
        ));
    }

    #endregion
}

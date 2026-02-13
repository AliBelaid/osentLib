using System.Text;
using System.Text.RegularExpressions;

namespace AUSentinel.Api.Services;

/// <summary>
/// Parses advanced search query syntax and converts to OpenSearch-compatible structure
/// Supports: AND/OR/NOT operators, phrase matching ("..."), wildcards (* ?), field searches (field:value), parentheses grouping
/// </summary>
public class QueryParser
{
    // Regex patterns for parsing
    private static readonly Regex QuotedPhraseRegex = new(@"""([^""]+)""", RegexOptions.Compiled);
    private static readonly Regex FieldSearchRegex = new(@"(\w+):([^\s)]+)", RegexOptions.Compiled);
    private static readonly Regex OperatorRegex = new(@"\b(AND|OR|NOT)\b", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>
    /// Parse query string into structured query object
    /// </summary>
    public ParsedQuery Parse(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return new ParsedQuery { IsEmpty = true };
        }

        var result = new ParsedQuery
        {
            OriginalQuery = query,
            IsEmpty = false
        };

        // Extract quoted phrases first (preserve them)
        var phrases = new List<string>();
        var queryWithPlaceholders = QuotedPhraseRegex.Replace(query, match =>
        {
            phrases.Add(match.Groups[1].Value);
            return $"__PHRASE_{phrases.Count - 1}__";
        });

        // Extract field searches (e.g., title:keyword, category:security)
        var fieldSearches = new Dictionary<string, List<string>>();
        queryWithPlaceholders = FieldSearchRegex.Replace(queryWithPlaceholders, match =>
        {
            var field = match.Groups[1].Value.ToLower();
            var value = match.Groups[2].Value;

            if (!fieldSearches.ContainsKey(field))
                fieldSearches[field] = new List<string>();

            fieldSearches[field].Add(value);
            return ""; // Remove from main query
        });

        result.FieldSearches = fieldSearches;
        result.Phrases = phrases;

        // Parse remaining query for boolean operators and terms
        var tokens = TokenizeQuery(queryWithPlaceholders);
        result.Tokens = tokens;

        // Determine if query uses advanced syntax
        result.HasAdvancedSyntax = query.Contains("AND", StringComparison.OrdinalIgnoreCase) ||
                                   query.Contains("OR", StringComparison.OrdinalIgnoreCase) ||
                                   query.Contains("NOT", StringComparison.OrdinalIgnoreCase) ||
                                   query.Contains('"') ||
                                   query.Contains('*') ||
                                   query.Contains('?') ||
                                   query.Contains(':') ||
                                   query.Contains('(');

        return result;
    }

    /// <summary>
    /// Tokenize query into terms and operators
    /// </summary>
    private List<QueryToken> TokenizeQuery(string query)
    {
        var tokens = new List<QueryToken>();
        var words = query.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);

        foreach (var word in words)
        {
            var trimmed = word.Trim('(', ')');

            if (string.IsNullOrWhiteSpace(trimmed))
                continue;

            if (trimmed.Equals("AND", StringComparison.OrdinalIgnoreCase))
            {
                tokens.Add(new QueryToken { Type = TokenType.And });
            }
            else if (trimmed.Equals("OR", StringComparison.OrdinalIgnoreCase))
            {
                tokens.Add(new QueryToken { Type = TokenType.Or });
            }
            else if (trimmed.Equals("NOT", StringComparison.OrdinalIgnoreCase))
            {
                tokens.Add(new QueryToken { Type = TokenType.Not });
            }
            else if (trimmed.StartsWith("__PHRASE_") && trimmed.EndsWith("__"))
            {
                tokens.Add(new QueryToken { Type = TokenType.Phrase, Value = trimmed });
            }
            else
            {
                tokens.Add(new QueryToken { Type = TokenType.Term, Value = trimmed });
            }
        }

        return tokens;
    }

    /// <summary>
    /// Build OpenSearch query string from parsed query
    /// </summary>
    public string BuildOpenSearchQuery(ParsedQuery parsed)
    {
        if (parsed.IsEmpty)
            return "*";

        var queryParts = new List<string>();

        // Add field-specific searches
        foreach (var fieldSearch in parsed.FieldSearches)
        {
            foreach (var value in fieldSearch.Value)
            {
                queryParts.Add($"{fieldSearch.Key}:{value}");
            }
        }

        // Build main query from tokens
        var mainQuery = BuildQueryFromTokens(parsed.Tokens, parsed.Phrases);
        if (!string.IsNullOrWhiteSpace(mainQuery))
        {
            queryParts.Add(mainQuery);
        }

        return queryParts.Count > 0 ? string.Join(" AND ", queryParts) : "*";
    }

    private string BuildQueryFromTokens(List<QueryToken> tokens, List<string> phrases)
    {
        if (tokens.Count == 0)
            return string.Empty;

        var result = new StringBuilder();
        var lastOperator = "AND"; // Default operator

        for (int i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];

            switch (token.Type)
            {
                case TokenType.And:
                    lastOperator = "AND";
                    result.Append(" AND ");
                    break;

                case TokenType.Or:
                    lastOperator = "OR";
                    result.Append(" OR ");
                    break;

                case TokenType.Not:
                    result.Append(" NOT ");
                    break;

                case TokenType.Phrase:
                    // Replace placeholder with actual phrase
                    var phraseMatch = Regex.Match(token.Value, @"__PHRASE_(\d+)__");
                    if (phraseMatch.Success)
                    {
                        var phraseIndex = int.Parse(phraseMatch.Groups[1].Value);
                        if (phraseIndex < phrases.Count)
                        {
                            result.Append($"\"{phrases[phraseIndex]}\"");
                        }
                    }
                    break;

                case TokenType.Term:
                    // Handle wildcards (* and ?)
                    result.Append(token.Value);
                    break;
            }
        }

        return result.ToString().Trim();
    }

    /// <summary>
    /// Validate query syntax
    /// </summary>
    public (bool IsValid, string? Error) ValidateQuery(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return (true, null);

        // Check for unmatched quotes
        var quoteCount = query.Count(c => c == '"');
        if (quoteCount % 2 != 0)
            return (false, "Unmatched quote in query");

        // Check for unmatched parentheses
        var openParens = query.Count(c => c == '(');
        var closeParens = query.Count(c => c == ')');
        if (openParens != closeParens)
            return (false, "Unmatched parentheses in query");

        // Check for invalid operator usage
        if (query.Trim().StartsWith("AND", StringComparison.OrdinalIgnoreCase) ||
            query.Trim().StartsWith("OR", StringComparison.OrdinalIgnoreCase))
            return (false, "Query cannot start with AND/OR operator");

        if (query.Trim().EndsWith("AND", StringComparison.OrdinalIgnoreCase) ||
            query.Trim().EndsWith("OR", StringComparison.OrdinalIgnoreCase) ||
            query.Trim().EndsWith("NOT", StringComparison.OrdinalIgnoreCase))
            return (false, "Query cannot end with an operator");

        return (true, null);
    }
}

public class ParsedQuery
{
    public string OriginalQuery { get; set; } = string.Empty;
    public bool IsEmpty { get; set; }
    public bool HasAdvancedSyntax { get; set; }
    public List<QueryToken> Tokens { get; set; } = new();
    public Dictionary<string, List<string>> FieldSearches { get; set; } = new();
    public List<string> Phrases { get; set; } = new();
}

public class QueryToken
{
    public TokenType Type { get; set; }
    public string Value { get; set; } = string.Empty;
}

public enum TokenType
{
    Term,
    Phrase,
    And,
    Or,
    Not
}

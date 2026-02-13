using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Text;
using AUSentinel.Api.Data.Entities;

namespace AUSentinel.Api.Services;

public interface ICsvParserService
{
    Task<CsvParseResult<ArticleCsvRow>> ParseArticlesAsync(Stream fileStream);
    Task<CsvParseResult<UserCsvRow>> ParseUsersAsync(Stream fileStream);
    Task<CsvParseResult<SourceCsvRow>> ParseSourcesAsync(Stream fileStream);
    Task<CsvParseResult<KeywordListCsvRow>> ParseKeywordListsAsync(Stream fileStream);
}

public class CsvParserService : ICsvParserService
{
    private const int MaxFileSize = 50 * 1024 * 1024; // 50 MB
    private const int MaxRows = 100000;

    public async Task<CsvParseResult<ArticleCsvRow>> ParseArticlesAsync(Stream fileStream)
    {
        return await ParseCsvAsync<ArticleCsvRow, ArticleCsvRowMap>(fileStream, ValidateArticleRow);
    }

    public async Task<CsvParseResult<UserCsvRow>> ParseUsersAsync(Stream fileStream)
    {
        return await ParseCsvAsync<UserCsvRow, UserCsvRowMap>(fileStream, ValidateUserRow);
    }

    public async Task<CsvParseResult<SourceCsvRow>> ParseSourcesAsync(Stream fileStream)
    {
        return await ParseCsvAsync<SourceCsvRow, SourceCsvRowMap>(fileStream, ValidateSourceRow);
    }

    public async Task<CsvParseResult<KeywordListCsvRow>> ParseKeywordListsAsync(Stream fileStream)
    {
        return await ParseCsvAsync<KeywordListCsvRow, KeywordListCsvRowMap>(fileStream, ValidateKeywordListRow);
    }

    private async Task<CsvParseResult<T>> ParseCsvAsync<T, TMap>(
        Stream fileStream,
        Func<T, int, string?> validateRow)
        where T : class
        where TMap : ClassMap<T>
    {
        var result = new CsvParseResult<T>();

        try
        {
            if (fileStream.Length > MaxFileSize)
            {
                result.Errors.Add(new CsvParseError
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = $"File size exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)} MB"
                });
                return result;
            }

            using var reader = new StreamReader(fileStream, Encoding.UTF8);
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                BadDataFound = context =>
                {
                    result.Errors.Add(new CsvParseError
                    {
                        RowNumber = context.Context.Parser.Row,
                        FieldName = context.Field,
                        ErrorMessage = $"Bad data found: {context.RawRecord}"
                    });
                }
            };

            using var csv = new CsvReader(reader, config);
            csv.Context.RegisterClassMap<TMap>();

            var records = new List<T>();
            var rowNumber = 1; // Start at 1 (header is row 0)

            await foreach (var record in csv.GetRecordsAsync<T>())
            {
                rowNumber++;

                if (rowNumber > MaxRows)
                {
                    result.Errors.Add(new CsvParseError
                    {
                        RowNumber = rowNumber,
                        ErrorMessage = $"Maximum row limit of {MaxRows} exceeded"
                    });
                    break;
                }

                // Validate the row
                var validationError = validateRow(record, rowNumber);
                if (validationError != null)
                {
                    result.Errors.Add(new CsvParseError
                    {
                        RowNumber = rowNumber,
                        ErrorMessage = validationError
                    });
                    continue;
                }

                records.Add(record);
            }

            result.Records = records;
            result.TotalRows = rowNumber - 1; // Exclude header
            result.SuccessCount = records.Count;
        }
        catch (Exception ex)
        {
            result.Errors.Add(new CsvParseError
            {
                RowNumber = 0,
                ErrorMessage = $"Failed to parse CSV: {ex.Message}"
            });
        }

        return result;
    }

    private string? ValidateArticleRow(ArticleCsvRow row, int rowNumber)
    {
        if (string.IsNullOrWhiteSpace(row.Title))
            return "Title is required";

        if (string.IsNullOrWhiteSpace(row.Url))
            return "URL is required";

        if (!Uri.TryCreate(row.Url, UriKind.Absolute, out _))
            return "URL is not valid";

        if (row.PublishedAt == default)
            return "PublishedAt is required and must be a valid date";

        return null;
    }

    private string? ValidateUserRow(UserCsvRow row, int rowNumber)
    {
        if (string.IsNullOrWhiteSpace(row.Username))
            return "Username is required";

        if (row.Username.Length < 3 || row.Username.Length > 50)
            return "Username must be between 3 and 50 characters";

        if (string.IsNullOrWhiteSpace(row.Email))
            return "Email is required";

        if (!IsValidEmail(row.Email))
            return "Email is not valid";

        if (string.IsNullOrWhiteSpace(row.CountryCode))
            return "CountryCode is required";

        if (row.CountryCode.Length != 2)
            return "CountryCode must be 2 characters (ISO 3166-1 alpha-2)";

        return null;
    }

    private string? ValidateSourceRow(SourceCsvRow row, int rowNumber)
    {
        if (string.IsNullOrWhiteSpace(row.Name))
            return "Name is required";

        if (string.IsNullOrWhiteSpace(row.Url))
            return "URL is required";

        if (!Uri.TryCreate(row.Url, UriKind.Absolute, out _))
            return "URL is not valid";

        if (string.IsNullOrWhiteSpace(row.CountryCode))
            return "CountryCode is required";

        if (row.CountryCode.Length != 2)
            return "CountryCode must be 2 characters (ISO 3166-1 alpha-2)";

        return null;
    }

    private string? ValidateKeywordListRow(KeywordListCsvRow row, int rowNumber)
    {
        if (string.IsNullOrWhiteSpace(row.Name))
            return "Name is required";

        if (string.IsNullOrWhiteSpace(row.Keywords))
            return "Keywords are required";

        if (string.IsNullOrWhiteSpace(row.Category))
            return "Category is required";

        return null;
    }

    private bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}

// CSV Row Models
public class ArticleCsvRow
{
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public string SourceName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int ThreatLevel { get; set; }
    public string CountryCodes { get; set; } = string.Empty; // Comma-separated
}

public class UserCsvRow
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string Role { get; set; } = "User"; // User, CountryAdmin, AUAdmin
    public bool IsActive { get; set; } = true;
}

public class SourceCsvRow
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int CredibilityScore { get; set; } = 50;
}

public class KeywordListCsvRow
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty; // Comma-separated
    public string Category { get; set; } = string.Empty;
    public bool IsPublic { get; set; } = false;
}

// CSV Class Maps (for CsvHelper)
public sealed class ArticleCsvRowMap : ClassMap<ArticleCsvRow>
{
    public ArticleCsvRowMap()
    {
        Map(m => m.Title).Name("Title");
        Map(m => m.Url).Name("URL");
        Map(m => m.Summary).Name("Summary").Optional();
        Map(m => m.Body).Name("Body").Optional();
        Map(m => m.PublishedAt).Name("PublishedAt");
        Map(m => m.SourceName).Name("SourceName");
        Map(m => m.Category).Name("Category").Optional();
        Map(m => m.ThreatLevel).Name("ThreatLevel").Optional().Default(0);
        Map(m => m.CountryCodes).Name("CountryCodes").Optional();
    }
}

public sealed class UserCsvRowMap : ClassMap<UserCsvRow>
{
    public UserCsvRowMap()
    {
        Map(m => m.Username).Name("Username");
        Map(m => m.Email).Name("Email");
        Map(m => m.FullName).Name("FullName").Optional();
        Map(m => m.CountryCode).Name("CountryCode");
        Map(m => m.Role).Name("Role").Optional().Default("User");
        Map(m => m.IsActive).Name("IsActive").Optional().Default(true);
    }
}

public sealed class SourceCsvRowMap : ClassMap<SourceCsvRow>
{
    public SourceCsvRowMap()
    {
        Map(m => m.Name).Name("Name");
        Map(m => m.Url).Name("URL");
        Map(m => m.Description).Name("Description").Optional();
        Map(m => m.CountryCode).Name("CountryCode");
        Map(m => m.Category).Name("Category").Optional();
        Map(m => m.IsActive).Name("IsActive").Optional().Default(true);
        Map(m => m.CredibilityScore).Name("CredibilityScore").Optional().Default(50);
    }
}

public sealed class KeywordListCsvRowMap : ClassMap<KeywordListCsvRow>
{
    public KeywordListCsvRowMap()
    {
        Map(m => m.Name).Name("Name");
        Map(m => m.Description).Name("Description").Optional();
        Map(m => m.Keywords).Name("Keywords");
        Map(m => m.Category).Name("Category");
        Map(m => m.IsPublic).Name("IsPublic").Optional().Default(false);
    }
}

// Result Models
public class CsvParseResult<T>
{
    public List<T> Records { get; set; } = new();
    public int TotalRows { get; set; }
    public int SuccessCount { get; set; }
    public List<CsvParseError> Errors { get; set; } = new();
    public bool HasErrors => Errors.Any();
}

public class CsvParseError
{
    public int RowNumber { get; set; }
    public string FieldName { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}

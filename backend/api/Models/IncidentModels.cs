namespace AUSentinel.Api.Models;

// ── List / filter ──────────────────────────────────────────────────────────

public record IncidentListRequest
{
    public string? Status { get; init; }
    public string? Severity { get; init; }
    public string? Sector { get; init; }
    public string? CountryCode { get; init; }
    public string? Query { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

// ── Create / Update ────────────────────────────────────────────────────────

public class CreateIncidentRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = "medium";
    public string Sector { get; set; } = string.Empty;
    public string IncidentType { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string? Source { get; set; }
    public List<string> AffectedSystems { get; set; } = new();
    public List<string> Iocs { get; set; } = new();
    public IFormFile? Attachment { get; set; }
}

public class UpdateIncidentRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Severity { get; set; }
    public string? Status { get; set; }
    public string? Sector { get; set; }
    public string? IncidentType { get; set; }
    public string? Source { get; set; }
    public List<string>? AffectedSystems { get; set; }
    public List<string>? Iocs { get; set; }
    public int? ContainmentPercent { get; set; }
    public string? AssignedToUserId { get; set; }
    public IFormFile? Attachment { get; set; }
}

// ── Response DTOs ──────────────────────────────────────────────────────────

public record IncidentDto(
    Guid Id,
    string Title,
    string Description,
    string Severity,
    string Status,
    string Sector,
    string IncidentType,
    string CountryCode,
    string CountryName,
    string? Source,
    List<string> AffectedSystems,
    List<string> Iocs,
    string? AttachmentName,
    string? AttachmentPath,
    int ContainmentPercent,
    Guid ReportedByUserId,
    string ReportedByName,
    Guid? AssignedToUserId,
    string? AssignedToName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ResolvedAt
);

public record IncidentListResult(
    List<IncidentDto> Items,
    int Total,
    int OpenCount,
    int InvestigatingCount,
    int ResolvedCount
);

public record IncidentStatsDto(
    int Total,
    int Open,
    int Investigating,
    int Contained,
    int Resolved,
    List<SectorCount> BySector,
    List<SectorCount> BySeverity,
    List<SectorCount> ByType
);

public record SectorCount(string Label, int Count);

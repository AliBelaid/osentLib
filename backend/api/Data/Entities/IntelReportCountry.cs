using System.ComponentModel.DataAnnotations;

namespace AUSentinel.Api.Data.Entities;

public class IntelReportCountry
{
    public Guid IntelReportId { get; set; }

    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;

    public IntelReport IntelReport { get; set; } = null!;
    public Country Country { get; set; } = null!;
}

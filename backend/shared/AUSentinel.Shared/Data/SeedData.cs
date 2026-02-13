using AUSentinel.Shared.Data.Entities;

namespace AUSentinel.Shared.Data;

public static class SeedData
{
    public static async Task Initialize(AppDbContext db)
    {
        if (db.Countries.Any()) return;

        var roles = new[]
        {
            new Role { Id = 1, Name = RoleNames.Viewer, Description = "Can view news, vote, and see dashboards" },
            new Role { Id = 2, Name = RoleNames.Editor, Description = "Can create and edit bulletins" },
            new Role { Id = 3, Name = RoleNames.CountryAdmin, Description = "Can manage country-level settings, publish bulletins, manage alert rules" },
            new Role { Id = 4, Name = RoleNames.AUAdmin, Description = "Full access across all countries" }
        };
        db.Roles.AddRange(roles);

        var countries = new[]
        {
            new Country { Code = "DZ", Name = "Algeria", NameArabic = "الجزائر", Region = "North" },
            new Country { Code = "AO", Name = "Angola", NameArabic = "أنغولا", Region = "Southern" },
            new Country { Code = "BJ", Name = "Benin", NameArabic = "بنين", Region = "West" },
            new Country { Code = "BW", Name = "Botswana", NameArabic = "بوتسوانا", Region = "Southern" },
            new Country { Code = "BF", Name = "Burkina Faso", NameArabic = "بوركينا فاسو", Region = "West" },
            new Country { Code = "BI", Name = "Burundi", NameArabic = "بوروندي", Region = "East" },
            new Country { Code = "CV", Name = "Cabo Verde", NameArabic = "الرأس الأخضر", Region = "West" },
            new Country { Code = "CM", Name = "Cameroon", NameArabic = "الكاميرون", Region = "Central" },
            new Country { Code = "CF", Name = "Central African Republic", NameArabic = "جمهورية أفريقيا الوسطى", Region = "Central" },
            new Country { Code = "TD", Name = "Chad", NameArabic = "تشاد", Region = "Central" },
            new Country { Code = "KM", Name = "Comoros", NameArabic = "جزر القمر", Region = "East" },
            new Country { Code = "CG", Name = "Congo", NameArabic = "الكونغو", Region = "Central" },
            new Country { Code = "CD", Name = "DR Congo", NameArabic = "جمهورية الكونغو الديمقراطية", Region = "Central" },
            new Country { Code = "CI", Name = "Côte d'Ivoire", NameArabic = "ساحل العاج", Region = "West" },
            new Country { Code = "DJ", Name = "Djibouti", NameArabic = "جيبوتي", Region = "East" },
            new Country { Code = "EG", Name = "Egypt", NameArabic = "مصر", Region = "North" },
            new Country { Code = "GQ", Name = "Equatorial Guinea", NameArabic = "غينيا الاستوائية", Region = "Central" },
            new Country { Code = "ER", Name = "Eritrea", NameArabic = "إريتريا", Region = "East" },
            new Country { Code = "SZ", Name = "Eswatini", NameArabic = "إسواتيني", Region = "Southern" },
            new Country { Code = "ET", Name = "Ethiopia", NameArabic = "إثيوبيا", Region = "East" },
            new Country { Code = "GA", Name = "Gabon", NameArabic = "الغابون", Region = "Central" },
            new Country { Code = "GM", Name = "Gambia", NameArabic = "غامبيا", Region = "West" },
            new Country { Code = "GH", Name = "Ghana", NameArabic = "غانا", Region = "West" },
            new Country { Code = "GN", Name = "Guinea", NameArabic = "غينيا", Region = "West" },
            new Country { Code = "GW", Name = "Guinea-Bissau", NameArabic = "غينيا بيساو", Region = "West" },
            new Country { Code = "KE", Name = "Kenya", NameArabic = "كينيا", Region = "East" },
            new Country { Code = "LS", Name = "Lesotho", NameArabic = "ليسوتو", Region = "Southern" },
            new Country { Code = "LR", Name = "Liberia", NameArabic = "ليبيريا", Region = "West" },
            new Country { Code = "LY", Name = "Libya", NameArabic = "ليبيا", Region = "North" },
            new Country { Code = "MG", Name = "Madagascar", NameArabic = "مدغشقر", Region = "East" },
            new Country { Code = "MW", Name = "Malawi", NameArabic = "مالاوي", Region = "Southern" },
            new Country { Code = "ML", Name = "Mali", NameArabic = "مالي", Region = "West" },
            new Country { Code = "MR", Name = "Mauritania", NameArabic = "موريتانيا", Region = "North" },
            new Country { Code = "MU", Name = "Mauritius", NameArabic = "موريشيوس", Region = "East" },
            new Country { Code = "MA", Name = "Morocco", NameArabic = "المغرب", Region = "North" },
            new Country { Code = "MZ", Name = "Mozambique", NameArabic = "موزمبيق", Region = "Southern" },
            new Country { Code = "NA", Name = "Namibia", NameArabic = "ناميبيا", Region = "Southern" },
            new Country { Code = "NE", Name = "Niger", NameArabic = "النيجر", Region = "West" },
            new Country { Code = "NG", Name = "Nigeria", NameArabic = "نيجيريا", Region = "West" },
            new Country { Code = "RW", Name = "Rwanda", NameArabic = "رواندا", Region = "East" },
            new Country { Code = "ST", Name = "São Tomé and Príncipe", NameArabic = "ساو تومي وبرينسيبي", Region = "Central" },
            new Country { Code = "SN", Name = "Senegal", NameArabic = "السنغال", Region = "West" },
            new Country { Code = "SC", Name = "Seychelles", NameArabic = "سيشيل", Region = "East" },
            new Country { Code = "SL", Name = "Sierra Leone", NameArabic = "سيراليون", Region = "West" },
            new Country { Code = "SO", Name = "Somalia", NameArabic = "الصومال", Region = "East" },
            new Country { Code = "ZA", Name = "South Africa", NameArabic = "جنوب أفريقيا", Region = "Southern" },
            new Country { Code = "SS", Name = "South Sudan", NameArabic = "جنوب السودان", Region = "East" },
            new Country { Code = "SD", Name = "Sudan", NameArabic = "السودان", Region = "North" },
            new Country { Code = "TZ", Name = "Tanzania", NameArabic = "تنزانيا", Region = "East" },
            new Country { Code = "TG", Name = "Togo", NameArabic = "توغو", Region = "West" },
            new Country { Code = "TN", Name = "Tunisia", NameArabic = "تونس", Region = "North" },
            new Country { Code = "UG", Name = "Uganda", NameArabic = "أوغندا", Region = "East" },
            new Country { Code = "ZM", Name = "Zambia", NameArabic = "زامبيا", Region = "Southern" },
            new Country { Code = "ZW", Name = "Zimbabwe", NameArabic = "زيمبابوي", Region = "Southern" },
            new Country { Code = "EH", Name = "Sahrawi Republic", NameArabic = "الجمهورية العربية الصحراوية", Region = "North" },
        };
        db.Countries.AddRange(countries);
        await db.SaveChangesAsync();

        var adminUser = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Username = "admin",
            Email = "admin@ausentinel.org",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            FullName = "AU Sentinel Administrator",
            CountryCode = "ET",
            PreferredLanguage = "en",
            IsActive = true
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();

        db.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = 4 });
        await db.SaveChangesAsync();

        var sources = new[]
        {
            new Source { Id = 1, Type = "GDELT", Name = "GDELT 2.1 DOC API", Url = "https://api.gdeltproject.org/api/v2/doc/doc", IsActive = true, FetchIntervalMinutes = 10 },
            new Source { Id = 2, Type = "RSS", Name = "AllAfrica", Url = "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", IsActive = true, FetchIntervalMinutes = 15 },
            new Source { Id = 3, Type = "RSS", Name = "ReliefWeb Africa", Url = "https://reliefweb.int/updates/rss.xml?primary_country=&country=&source=&format=&theme=&disaster_type=&vulnerable_groups=&date.from=&date.to=", IsActive = true, FetchIntervalMinutes = 15 },
        };
        db.Sources.AddRange(sources);
        await db.SaveChangesAsync();
    }
}

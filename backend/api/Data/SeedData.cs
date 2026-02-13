using AUSentinel.Api.Data.Entities;

namespace AUSentinel.Api.Data;

public static class SeedData
{
    public static async Task Initialize(AppDbContext db)
    {
        if (db.Countries.Any()) return;

        // Seed Roles
        var roles = new[]
        {
            new Role { Id = 1, Name = RoleNames.Viewer, Description = "Can view news, vote, and see dashboards" },
            new Role { Id = 2, Name = RoleNames.Editor, Description = "Can create and edit bulletins" },
            new Role { Id = 3, Name = RoleNames.CountryAdmin, Description = "Can manage country-level settings, publish bulletins, manage alert rules" },
            new Role { Id = 4, Name = RoleNames.AUAdmin, Description = "Full access across all countries" }
        };
        db.Roles.AddRange(roles);

        // Seed all 55 AU member states
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

        // Seed default admin user (password: Admin123!)
        var adminUser = new User
        {
            Id = Guid.Parse("00000000-0000-0000-0000-000000000001"),
            Username = "admin",
            Email = "admin@ausentinel.org",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            FullName = "AU Sentinel Administrator",
            CountryCode = "ET", // AU HQ in Addis Ababa
            PreferredLanguage = "en",
            IsActive = true
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();

        db.UserRoles.Add(new UserRole { UserId = adminUser.Id, RoleId = 4 }); // AUAdmin
        await db.SaveChangesAsync();

        // Seed default sources
        var sources = new[]
        {
            new Source { Id = 1, Type = "GDELT", Name = "GDELT 2.1 DOC API", Url = "https://api.gdeltproject.org/api/v2/doc/doc", IsActive = true, FetchIntervalMinutes = 10 },
            new Source { Id = 2, Type = "RSS", Name = "AllAfrica", Url = "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf", IsActive = true, FetchIntervalMinutes = 15 },
            new Source { Id = 3, Type = "RSS", Name = "ReliefWeb Africa", Url = "https://reliefweb.int/updates/rss.xml?primary_country=&country=&source=&format=&theme=&disaster_type=&vulnerable_groups=&date.from=&date.to=", IsActive = true, FetchIntervalMinutes = 15 },
        };
        db.Sources.AddRange(sources);
        await db.SaveChangesAsync();

        // Seed badges for XP system
        var badges = new[]
        {
            // Voting badges
            new Badge
            {
                Id = 1,
                Name = "First Vote",
                Description = "Cast your first vote on an article",
                IconUrl = "/badges/first-vote.svg",
                Category = "voting",
                RequiredCount = 1,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 2,
                Name = "Voter",
                Description = "Cast 10 votes",
                IconUrl = "/badges/voter.svg",
                Category = "voting",
                RequiredCount = 10,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 3,
                Name = "Active Voter",
                Description = "Cast 50 votes",
                IconUrl = "/badges/active-voter.svg",
                Category = "voting",
                RequiredCount = 50,
                Rarity = "rare",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 4,
                Name = "Super Voter",
                Description = "Cast 100 votes",
                IconUrl = "/badges/super-voter.svg",
                Category = "voting",
                RequiredCount = 100,
                Rarity = "epic",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 5,
                Name = "Voting Legend",
                Description = "Cast 500 votes",
                IconUrl = "/badges/voting-legend.svg",
                Category = "voting",
                RequiredCount = 500,
                Rarity = "legendary",
                CreatedAt = DateTime.UtcNow
            },

            // Bulletin badges
            new Badge
            {
                Id = 6,
                Name = "First Bulletin",
                Description = "Create your first security bulletin",
                IconUrl = "/badges/first-bulletin.svg",
                Category = "bulletins",
                RequiredCount = 1,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 7,
                Name = "Bulletin Author",
                Description = "Create 10 bulletins",
                IconUrl = "/badges/bulletin-author.svg",
                Category = "bulletins",
                RequiredCount = 10,
                Rarity = "rare",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 8,
                Name = "Bulletin Expert",
                Description = "Create 50 bulletins",
                IconUrl = "/badges/bulletin-expert.svg",
                Category = "bulletins",
                RequiredCount = 50,
                Rarity = "epic",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 9,
                Name = "Publisher",
                Description = "Publish your first bulletin",
                IconUrl = "/badges/publisher.svg",
                Category = "bulletins",
                RequiredCount = 1,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },

            // Bookmark badges
            new Badge
            {
                Id = 10,
                Name = "Collector",
                Description = "Save 10 bookmarks",
                IconUrl = "/badges/collector.svg",
                Category = "bookmarks",
                RequiredCount = 10,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 11,
                Name = "Librarian",
                Description = "Save 50 bookmarks",
                IconUrl = "/badges/librarian.svg",
                Category = "bookmarks",
                RequiredCount = 50,
                Rarity = "rare",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 12,
                Name = "Archive Master",
                Description = "Save 100 bookmarks",
                IconUrl = "/badges/archive-master.svg",
                Category = "bookmarks",
                RequiredCount = 100,
                Rarity = "epic",
                CreatedAt = DateTime.UtcNow
            },

            // Alert badges
            new Badge
            {
                Id = 13,
                Name = "Alert Responder",
                Description = "Acknowledge 10 alerts",
                IconUrl = "/badges/alert-responder.svg",
                Category = "alerts",
                RequiredCount = 10,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 14,
                Name = "Alert Handler",
                Description = "Acknowledge 50 alerts",
                IconUrl = "/badges/alert-handler.svg",
                Category = "alerts",
                RequiredCount = 50,
                Rarity = "rare",
                CreatedAt = DateTime.UtcNow
            },

            // Engagement badges
            new Badge
            {
                Id = 15,
                Name = "Welcome",
                Description = "Complete your profile",
                IconUrl = "/badges/welcome.svg",
                Category = "engagement",
                RequiredCount = 1,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 16,
                Name = "Dedicated",
                Description = "Use AU Sentinel for 7 consecutive days",
                IconUrl = "/badges/dedicated.svg",
                Category = "engagement",
                RequiredCount = 7,
                Rarity = "rare",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 17,
                Name = "Committed",
                Description = "Use AU Sentinel for 30 consecutive days",
                IconUrl = "/badges/committed.svg",
                Category = "engagement",
                RequiredCount = 30,
                Rarity = "epic",
                CreatedAt = DateTime.UtcNow
            },

            // Level badges
            new Badge
            {
                Id = 18,
                Name = "Apprentice",
                Description = "Reach Level 2",
                IconUrl = "/badges/level-2.svg",
                Category = "level",
                RequiredCount = 2,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 19,
                Name = "Professional",
                Description = "Reach Level 3",
                IconUrl = "/badges/level-3.svg",
                Category = "level",
                RequiredCount = 3,
                Rarity = "common",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 20,
                Name = "Expert",
                Description = "Reach Level 5",
                IconUrl = "/badges/level-5.svg",
                Category = "level",
                RequiredCount = 5,
                Rarity = "rare",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 21,
                Name = "Master",
                Description = "Reach Level 7",
                IconUrl = "/badges/level-7.svg",
                Category = "level",
                RequiredCount = 7,
                Rarity = "epic",
                CreatedAt = DateTime.UtcNow
            },
            new Badge
            {
                Id = 22,
                Name = "Elite",
                Description = "Reach the maximum level",
                IconUrl = "/badges/level-max.svg",
                Category = "level",
                RequiredCount = 10,
                Rarity = "legendary",
                CreatedAt = DateTime.UtcNow
            },
        };
        db.Badges.AddRange(badges);
        await db.SaveChangesAsync();
    }
}

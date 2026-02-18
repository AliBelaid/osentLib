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

        // Seed sample analyst users for leaderboard
        var sampleUsers = new[]
        {
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000010"), Username = "fatima.hassan", Email = "fatima@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "Fatima Hassan", CountryCode = "EG", PreferredLanguage = "ar", IsActive = true },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000011"), Username = "kwame.asante", Email = "kwame@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "Kwame Asante", CountryCode = "GH", PreferredLanguage = "en", IsActive = true },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000012"), Username = "amina.diallo", Email = "amina@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "Amina Diallo", CountryCode = "SN", PreferredLanguage = "fr", IsActive = true },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000013"), Username = "nelson.mwangi", Email = "nelson@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "Nelson Mwangi", CountryCode = "KE", PreferredLanguage = "en", IsActive = true },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000014"), Username = "zara.okafor", Email = "zara@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "Zara Okafor", CountryCode = "NG", PreferredLanguage = "en", IsActive = true },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000015"), Username = "moussa.traore", Email = "moussa@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "Moussa Traoré", CountryCode = "ML", PreferredLanguage = "fr", IsActive = true },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000016"), Username = "sofia.benali", Email = "sofia@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "Sofia Benali", CountryCode = "MA", PreferredLanguage = "ar", IsActive = true },
            new User { Id = Guid.Parse("00000000-0000-0000-0000-000000000017"), Username = "david.kimani", Email = "david@ausentinel.org", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Analyst1!"), FullName = "David Kimani", CountryCode = "TZ", PreferredLanguage = "en", IsActive = true },
        };
        db.Users.AddRange(sampleUsers);
        await db.SaveChangesAsync();

        // Assign Viewer role to sample users
        foreach (var u in sampleUsers)
            db.UserRoles.Add(new UserRole { UserId = u.Id, RoleId = 1 });
        await db.SaveChangesAsync();

        // Seed UserExperience for leaderboard
        var xpData = new[]
        {
            (Guid.Parse("00000000-0000-0000-0000-000000000001"), 4200, 7, 700, 1000), // admin
            (Guid.Parse("00000000-0000-0000-0000-000000000010"), 5800, 8, 300, 1200), // fatima - top
            (Guid.Parse("00000000-0000-0000-0000-000000000011"), 3600, 6, 600, 800),  // kwame
            (Guid.Parse("00000000-0000-0000-0000-000000000012"), 4900, 7, 400, 1000), // amina
            (Guid.Parse("00000000-0000-0000-0000-000000000013"), 2800, 5, 300, 600),  // nelson
            (Guid.Parse("00000000-0000-0000-0000-000000000014"), 3100, 5, 600, 600),  // zara
            (Guid.Parse("00000000-0000-0000-0000-000000000015"), 1500, 3, 300, 400),  // moussa
            (Guid.Parse("00000000-0000-0000-0000-000000000016"), 2200, 4, 200, 500),  // sofia
            (Guid.Parse("00000000-0000-0000-0000-000000000017"), 1800, 4, 300, 500),  // david
        };
        foreach (var (userId, totalXp, level, currentXp, nextXp) in xpData)
        {
            db.UserExperiences.Add(new UserExperience
            {
                UserId = userId,
                TotalXp = totalXp,
                Level = level,
                CurrentLevelXp = currentXp,
                NextLevelXp = nextXp,
                LastActivityAt = DateTime.UtcNow.AddHours(-Random.Shared.Next(1, 48)),
                CreatedAt = DateTime.UtcNow.AddDays(-Random.Shared.Next(30, 90))
            });
        }
        await db.SaveChangesAsync();

        // Seed published bulletins
        var adminId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var bulletins = new[]
        {
            new Bulletin
            {
                Title = "Security Advisory: Increased Cyber Threats Targeting Critical Infrastructure in East Africa",
                Content = "AU CERT has observed a significant increase in cyber attacks targeting energy and telecommunications infrastructure across East African member states. Threat actors are using spear-phishing campaigns and exploiting unpatched VPN appliances. Member states are advised to immediately patch all internet-facing systems and enable multi-factor authentication on all administrative accounts. Indicators of compromise (IOCs) have been shared through the AU-CERT secure channel.",
                CountryCode = "ET", Status = "published", Severity = 4, Category = "Security",
                CreatedByUserId = adminId, PublishedByUserId = adminId,
                CreatedAt = DateTime.UtcNow.AddDays(-2), PublishedAt = DateTime.UtcNow.AddDays(-2)
            },
            new Bulletin
            {
                Title = "Intelligence Report: Humanitarian Crisis Escalation in the Sahel Region",
                Content = "Latest OSINT analysis indicates deteriorating humanitarian conditions across the Sahel belt, particularly in Niger, Mali, and Burkina Faso. Satellite imagery reveals increased displacement patterns, with an estimated 2.4 million people newly affected. Cross-border armed group activity has intensified near the tri-border area. The AU Peace and Security Council has been briefed and emergency response coordination is underway with ECOWAS partners.",
                CountryCode = "NE", Status = "published", Severity = 5, Category = "Security",
                CreatedByUserId = adminId, PublishedByUserId = adminId,
                CreatedAt = DateTime.UtcNow.AddDays(-5), PublishedAt = DateTime.UtcNow.AddDays(-4)
            },
            new Bulletin
            {
                Title = "Disease Outbreak Alert: Cholera Cases Reported Across Southern Africa",
                Content = "WHO and AU Health Division report a surge in cholera cases across Mozambique, Malawi, and Zimbabwe following recent flooding events. Over 3,200 cases confirmed with 47 fatalities. Water treatment facilities in affected areas have been compromised. Emergency medical supplies are being deployed through the African CDC rapid response mechanism. Member states are urged to activate cross-border health surveillance protocols.",
                CountryCode = "MZ", Status = "published", Severity = 4, Category = "Health",
                CreatedByUserId = adminId, PublishedByUserId = adminId,
                CreatedAt = DateTime.UtcNow.AddDays(-3), PublishedAt = DateTime.UtcNow.AddDays(-3)
            },
            new Bulletin
            {
                Title = "Political Situation Analysis: Electoral Process Monitoring in West Africa",
                Content = "The AU Election Observation Mission reports on ongoing electoral preparations in multiple West African states. Pre-election tensions have been noted in some regions, with opposition groups raising concerns about voter registration irregularities. Social media monitoring reveals coordinated disinformation campaigns targeting electoral institutions. The AU Commission has dispatched additional observer teams and is working with regional bodies to ensure credible electoral processes.",
                CountryCode = "NG", Status = "published", Severity = 3, Category = "Politics",
                CreatedByUserId = adminId, PublishedByUserId = adminId,
                CreatedAt = DateTime.UtcNow.AddDays(-7), PublishedAt = DateTime.UtcNow.AddDays(-6)
            },
            new Bulletin
            {
                Title = "Environmental Alert: Desert Locust Swarms Detected in Horn of Africa",
                Content = "FAO early warning systems and AU satellite monitoring detect new desert locust breeding grounds in the Horn of Africa. Swarms are projected to move across Ethiopia, Somalia, and Kenya within 2-3 weeks. Agricultural damage estimates could affect food security for 12 million people. Aerial spraying operations have commenced in coordination with national authorities. Member states in the projected path are advised to activate emergency pest control protocols.",
                CountryCode = "ET", Status = "published", Severity = 3, Category = "Environment",
                CreatedByUserId = adminId, PublishedByUserId = adminId,
                CreatedAt = DateTime.UtcNow.AddDays(-1), PublishedAt = DateTime.UtcNow.AddDays(-1)
            },
        };
        db.Bulletins.AddRange(bulletins);
        await db.SaveChangesAsync();

        // Seed additional alert rules
        var alertRules = new[]
        {
            new AlertRule { Id = 1, Name = "High Threat Auto-Alert", CountryCode = "ET", MinThreatLevel = 4, IsActive = true, CreatedByUserId = adminId, CreatedAt = DateTime.UtcNow },
            new AlertRule { Id = 2, Name = "Sahel Region Security Monitor", CountryCode = "NE", Category = "Security", MinThreatLevel = 3, Keywords = "armed group,terrorism,Boko Haram,JNIM,ISWAP", IsActive = true, CreatedByUserId = adminId, CreatedAt = DateTime.UtcNow },
            new AlertRule { Id = 3, Name = "North Africa Political Instability", CountryCode = "LY", Category = "Politics", MinThreatLevel = 3, Keywords = "coup,protest,election,unrest,militia", IsActive = true, CreatedByUserId = adminId, CreatedAt = DateTime.UtcNow },
            new AlertRule { Id = 4, Name = "Great Lakes Conflict Tracker", CountryCode = "CD", Category = "Security", MinThreatLevel = 4, Keywords = "M23,ADF,displacement,conflict,peacekeeping", IsActive = true, CreatedByUserId = adminId, CreatedAt = DateTime.UtcNow },
            new AlertRule { Id = 5, Name = "Health Emergency - Disease Outbreak", CountryCode = "ET", Category = "Health", MinThreatLevel = 3, Keywords = "cholera,ebola,outbreak,epidemic,pandemic,WHO", IsActive = true, CreatedByUserId = adminId, CreatedAt = DateTime.UtcNow },
            new AlertRule { Id = 6, Name = "West Africa Maritime Security", CountryCode = "NG", Category = "Security", MinThreatLevel = 3, Keywords = "piracy,maritime,Gulf of Guinea,smuggling,kidnapping", IsActive = false, CreatedByUserId = adminId, CreatedAt = DateTime.UtcNow },
        };
        db.AlertRules.AddRange(alertRules);
        await db.SaveChangesAsync();
    }
}

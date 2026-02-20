using AUSentinel.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace AUSentinel.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<Source> Sources => Set<Source>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ArticleEntity> ArticleEntities => Set<ArticleEntity>();
    public DbSet<ArticleCountryTag> ArticleCountryTags => Set<ArticleCountryTag>();
    public DbSet<Classification> Classifications => Set<Classification>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<Bookmark> Bookmarks => Set<Bookmark>();
    public DbSet<BookmarkCollection> BookmarkCollections => Set<BookmarkCollection>();
    public DbSet<UserExperience> UserExperiences => Set<UserExperience>();
    public DbSet<Badge> Badges => Set<Badge>();
    public DbSet<UserBadge> UserBadges => Set<UserBadge>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<SavedSearch> SavedSearches => Set<SavedSearch>();
    public DbSet<KeywordList> KeywordLists => Set<KeywordList>();
    public DbSet<ImportJob> ImportJobs => Set<ImportJob>();
    public DbSet<DnsLookup> DnsLookups => Set<DnsLookup>();
    public DbSet<DomainWatchlist> DomainWatchlists => Set<DomainWatchlist>();
    public DbSet<ExternalSearchQuery> ExternalSearchQueries => Set<ExternalSearchQuery>();
    public DbSet<Bulletin> Bulletins => Set<Bulletin>();
    public DbSet<BulletinAttachment> BulletinAttachments => Set<BulletinAttachment>();
    public DbSet<AlertRule> AlertRules => Set<AlertRule>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<AlertDelivery> AlertDeliveries => Set<AlertDelivery>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<IntelReport> IntelReports => Set<IntelReport>();
    public DbSet<IntelReportCountry> IntelReportCountries => Set<IntelReportCountry>();
    public DbSet<IntelReportAttachment> IntelReportAttachments => Set<IntelReportAttachment>();
    public DbSet<IntelTimelineEntry> IntelTimelineEntries => Set<IntelTimelineEntry>();
    public DbSet<IntelTimelineAttachment> IntelTimelineAttachments => Set<IntelTimelineAttachment>();
    public DbSet<IntelReportLink> IntelReportLinks => Set<IntelReportLink>();
    public DbSet<Incident> Incidents => Set<Incident>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Country
        modelBuilder.Entity<Country>(e =>
        {
            e.HasKey(c => c.Code);
            e.Property(c => c.Code).HasMaxLength(2).IsFixedLength();
        });

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();
            e.HasOne(u => u.Country).WithMany(c => c.Users).HasForeignKey(u => u.CountryCode);
        });

        // UserProfile
        modelBuilder.Entity<UserProfile>(e =>
        {
            e.HasIndex(up => up.UserId).IsUnique();
            e.HasOne(up => up.User).WithOne(u => u.Profile).HasForeignKey<UserProfile>(up => up.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(up => up.Bio).HasMaxLength(500);
            e.Property(up => up.AvatarUrl).HasMaxLength(500);
            e.Property(up => up.Organization).HasMaxLength(200);
            e.Property(up => up.JobTitle).HasMaxLength(100);
            e.Property(up => up.PhoneNumber).HasMaxLength(20);
            e.Property(up => up.LinkedInUrl).HasMaxLength(200);
            e.Property(up => up.TwitterHandle).HasMaxLength(50);
        });

        // BookmarkCollection
        modelBuilder.Entity<BookmarkCollection>(e =>
        {
            e.HasIndex(bc => bc.UserId);
            e.HasOne(bc => bc.User).WithMany().HasForeignKey(bc => bc.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(bc => bc.Name).HasMaxLength(100).IsRequired();
            e.Property(bc => bc.Description).HasMaxLength(500);
            e.Property(bc => bc.Color).HasMaxLength(7).IsRequired();
        });

        // Bookmark
        modelBuilder.Entity<Bookmark>(e =>
        {
            e.HasIndex(b => new { b.UserId, b.ArticleId }).IsUnique();
            e.HasIndex(b => b.CollectionId);
            e.HasOne(b => b.User).WithMany().HasForeignKey(b => b.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(b => b.Article).WithMany().HasForeignKey(b => b.ArticleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(b => b.Collection).WithMany(c => c.Bookmarks).HasForeignKey(b => b.CollectionId).OnDelete(DeleteBehavior.SetNull);
            e.Property(b => b.Notes).HasMaxLength(1000);
        });

        // UserRole
        modelBuilder.Entity<UserRole>(e =>
        {
            e.HasKey(ur => new { ur.UserId, ur.RoleId });
            e.HasOne(ur => ur.User).WithMany(u => u.UserRoles).HasForeignKey(ur => ur.UserId);
            e.HasOne(ur => ur.Role).WithMany(r => r.UserRoles).HasForeignKey(ur => ur.RoleId);
        });

        // Article
        modelBuilder.Entity<Article>(e =>
        {
            e.HasIndex(a => a.DedupHash).IsUnique();
            e.HasIndex(a => a.PublishedAt);
            e.HasOne(a => a.Source).WithMany(s => s.Articles).HasForeignKey(a => a.SourceId);
        });

        // ArticleEntity
        modelBuilder.Entity<ArticleEntity>(e =>
        {
            e.HasOne(ae => ae.Article).WithMany(a => a.Entities).HasForeignKey(ae => ae.ArticleId);
        });

        // ArticleCountryTag
        modelBuilder.Entity<ArticleCountryTag>(e =>
        {
            e.HasKey(act => new { act.ArticleId, act.CountryCode });
            e.HasOne(act => act.Article).WithMany(a => a.CountryTags).HasForeignKey(act => act.ArticleId);
            e.HasOne(act => act.Country).WithMany(c => c.Articles).HasForeignKey(act => act.CountryCode);
        });

        // Classification
        modelBuilder.Entity<Classification>(e =>
        {
            e.HasIndex(c => c.ArticleId).IsUnique();
            e.HasOne(c => c.Article).WithOne(a => a.Classification).HasForeignKey<Classification>(c => c.ArticleId);
        });

        // Vote - unique per user per article
        modelBuilder.Entity<Vote>(e =>
        {
            e.HasIndex(v => new { v.ArticleId, v.UserId }).IsUnique();
            e.HasOne(v => v.Article).WithMany(a => a.Votes).HasForeignKey(v => v.ArticleId);
            e.HasOne(v => v.User).WithMany(u => u.Votes).HasForeignKey(v => v.UserId);
        });

        // UserExperience
        modelBuilder.Entity<UserExperience>(e =>
        {
            e.HasIndex(ue => ue.UserId).IsUnique();
            e.HasIndex(ue => ue.TotalXp);
            e.HasOne(ue => ue.User).WithOne().HasForeignKey<UserExperience>(ue => ue.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Badge
        modelBuilder.Entity<Badge>(e =>
        {
            e.Property(b => b.Name).HasMaxLength(100).IsRequired();
            e.Property(b => b.Description).HasMaxLength(500).IsRequired();
            e.Property(b => b.IconUrl).HasMaxLength(500).IsRequired();
            e.Property(b => b.Category).HasMaxLength(50).IsRequired();
            e.Property(b => b.Rarity).HasMaxLength(20).IsRequired();
            e.HasIndex(b => b.Category);
        });

        // UserBadge
        modelBuilder.Entity<UserBadge>(e =>
        {
            e.HasIndex(ub => new { ub.UserId, ub.BadgeId }).IsUnique();
            e.HasIndex(ub => ub.EarnedAt);
            e.HasOne(ub => ub.User).WithMany().HasForeignKey(ub => ub.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ub => ub.Badge).WithMany(b => b.UserBadges).HasForeignKey(ub => ub.BadgeId).OnDelete(DeleteBehavior.Cascade);
        });

        // ActivityLog
        modelBuilder.Entity<ActivityLog>(e =>
        {
            e.HasIndex(al => al.UserId);
            e.HasIndex(al => al.CreatedAt);
            e.HasIndex(al => al.ActivityType);
            e.Property(al => al.ActivityType).HasMaxLength(50).IsRequired();
            e.Property(al => al.EntityType).HasMaxLength(50);
            e.Property(al => al.Metadata).HasColumnType("jsonb");
            e.HasOne(al => al.User).WithMany().HasForeignKey(al => al.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // SavedSearch
        modelBuilder.Entity<SavedSearch>(e =>
        {
            e.HasIndex(ss => ss.UserId);
            e.HasIndex(ss => ss.Category);
            e.HasIndex(ss => ss.IsPublic);
            e.Property(ss => ss.Name).HasMaxLength(200).IsRequired();
            e.Property(ss => ss.Description).HasMaxLength(500);
            e.Property(ss => ss.Query).HasMaxLength(2000).IsRequired();
            e.Property(ss => ss.Category).HasMaxLength(50);
            e.Property(ss => ss.ThreatType).HasMaxLength(50);
            e.Property(ss => ss.CountryCode).HasMaxLength(2);
            e.Property(ss => ss.SortBy).HasMaxLength(20);
            e.HasOne(ss => ss.User).WithMany().HasForeignKey(ss => ss.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // KeywordList
        modelBuilder.Entity<KeywordList>(e =>
        {
            e.HasIndex(kl => kl.UserId);
            e.HasIndex(kl => kl.Category);
            e.HasIndex(kl => kl.IsPublic);
            e.Property(kl => kl.Name).HasMaxLength(200).IsRequired();
            e.Property(kl => kl.Description).HasMaxLength(500);
            e.Property(kl => kl.Keywords).HasMaxLength(5000).IsRequired();
            e.Property(kl => kl.Category).HasMaxLength(50).IsRequired();
            e.HasOne(kl => kl.User).WithMany().HasForeignKey(kl => kl.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ImportJob
        modelBuilder.Entity<ImportJob>(e =>
        {
            e.HasIndex(ij => ij.UserId);
            e.HasIndex(ij => ij.Status);
            e.HasIndex(ij => ij.CreatedAt);
            e.Property(ij => ij.FileName).HasMaxLength(255).IsRequired();
            e.Property(ij => ij.ImportType).HasMaxLength(50).IsRequired();
            e.Property(ij => ij.Status).HasMaxLength(20).IsRequired();
            e.Property(ij => ij.ErrorMessage).HasMaxLength(1000);
            e.Property(ij => ij.ErrorDetails).HasColumnType("jsonb");
            e.HasOne(ij => ij.User).WithMany().HasForeignKey(ij => ij.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Bulletin
        modelBuilder.Entity<Bulletin>(e =>
        {
            e.HasIndex(b => b.CountryCode);
            e.HasIndex(b => b.Status);
            e.HasOne(b => b.Country).WithMany().HasForeignKey(b => b.CountryCode);
            e.HasOne(b => b.CreatedByUser).WithMany().HasForeignKey(b => b.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(b => b.PublishedByUser).WithMany().HasForeignKey(b => b.PublishedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // BulletinAttachment
        modelBuilder.Entity<BulletinAttachment>(e =>
        {
            e.HasOne(ba => ba.Bulletin).WithMany(b => b.Attachments).HasForeignKey(ba => ba.BulletinId);
        });

        // AlertRule
        modelBuilder.Entity<AlertRule>(e =>
        {
            e.HasOne(ar => ar.Country).WithMany().HasForeignKey(ar => ar.CountryCode);
            e.HasOne(ar => ar.CreatedByUser).WithMany().HasForeignKey(ar => ar.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Alert
        modelBuilder.Entity<Alert>(e =>
        {
            e.HasIndex(a => a.CountryCode);
            e.HasIndex(a => a.IsActive);
            e.HasOne(a => a.AlertRule).WithMany(ar => ar.Alerts).HasForeignKey(a => a.AlertRuleId);
            e.HasOne(a => a.Article).WithMany().HasForeignKey(a => a.ArticleId).OnDelete(DeleteBehavior.SetNull);
        });

        // AlertDelivery
        modelBuilder.Entity<AlertDelivery>(e =>
        {
            e.HasOne(ad => ad.Alert).WithMany(a => a.Deliveries).HasForeignKey(ad => ad.AlertId);
            e.HasOne(ad => ad.User).WithMany().HasForeignKey(ad => ad.UserId);
        });

        // AuditLog
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasIndex(al => al.Timestamp);
            e.HasIndex(al => al.UserId);
        });

        // DnsLookup
        modelBuilder.Entity<DnsLookup>(e =>
        {
            e.HasIndex(dl => dl.Domain);
            e.HasIndex(dl => dl.UserId);
            e.HasIndex(dl => dl.LookedUpAt);
            e.HasIndex(dl => dl.IsSuspicious);
            e.Property(dl => dl.Domain).HasMaxLength(255).IsRequired();
            e.Property(dl => dl.ARecords).HasColumnType("jsonb");
            e.Property(dl => dl.MxRecords).HasColumnType("jsonb");
            e.Property(dl => dl.TxtRecords).HasColumnType("jsonb");
            e.Property(dl => dl.NsRecords).HasColumnType("jsonb");
            e.Property(dl => dl.RiskFactors).HasColumnType("jsonb");
            e.HasOne(dl => dl.User).WithMany().HasForeignKey(dl => dl.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // DomainWatchlist
        modelBuilder.Entity<DomainWatchlist>(e =>
        {
            e.HasIndex(dw => dw.Domain).IsUnique();
            e.HasIndex(dw => dw.Status);
            e.HasIndex(dw => dw.CountryCode);
            e.Property(dw => dw.Domain).HasMaxLength(255).IsRequired();
            e.Property(dw => dw.Status).HasMaxLength(20).IsRequired();
            e.Property(dw => dw.Tags).HasColumnType("jsonb");
            e.HasOne(dw => dw.AddedByUser).WithMany().HasForeignKey(dw => dw.AddedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(dw => dw.Country).WithMany().HasForeignKey(dw => dw.CountryCode).OnDelete(DeleteBehavior.SetNull);
        });

        // IntelReport
        modelBuilder.Entity<IntelReport>(e =>
        {
            e.HasIndex(ir => ir.CountryCode);
            e.HasIndex(ir => ir.Status);
            e.HasIndex(ir => ir.Type);
            e.HasIndex(ir => ir.CreatedAt);
            e.HasOne(ir => ir.Country).WithMany().HasForeignKey(ir => ir.CountryCode);
            e.HasOne(ir => ir.CreatedByUser).WithMany().HasForeignKey(ir => ir.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // IntelReportCountry
        modelBuilder.Entity<IntelReportCountry>(e =>
        {
            e.HasKey(irc => new { irc.IntelReportId, irc.CountryCode });
            e.HasOne(irc => irc.IntelReport).WithMany(ir => ir.AffectedCountries).HasForeignKey(irc => irc.IntelReportId);
            e.HasOne(irc => irc.Country).WithMany().HasForeignKey(irc => irc.CountryCode);
        });

        // IntelReportAttachment
        modelBuilder.Entity<IntelReportAttachment>(e =>
        {
            e.HasOne(ira => ira.IntelReport).WithMany(ir => ir.Attachments).HasForeignKey(ira => ira.IntelReportId);
        });

        // IntelTimelineEntry
        modelBuilder.Entity<IntelTimelineEntry>(e =>
        {
            e.HasIndex(ite => ite.IntelReportId);
            e.HasIndex(ite => ite.CreatedAt);
            e.HasOne(ite => ite.IntelReport).WithMany(ir => ir.TimelineEntries).HasForeignKey(ite => ite.IntelReportId);
            e.HasOne(ite => ite.User).WithMany().HasForeignKey(ite => ite.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // IntelTimelineAttachment
        modelBuilder.Entity<IntelTimelineAttachment>(e =>
        {
            e.HasOne(ita => ita.TimelineEntry).WithMany(ite => ite.Attachments).HasForeignKey(ita => ita.TimelineEntryId);
        });

        // IntelReportLink
        modelBuilder.Entity<IntelReportLink>(e =>
        {
            e.HasIndex(irl => irl.SourceReportId);
            e.HasIndex(irl => irl.TargetReportId);
            e.HasOne(irl => irl.SourceReport).WithMany(ir => ir.SourceLinks).HasForeignKey(irl => irl.SourceReportId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(irl => irl.TargetReport).WithMany(ir => ir.TargetLinks).HasForeignKey(irl => irl.TargetReportId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(irl => irl.CreatedByUser).WithMany().HasForeignKey(irl => irl.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // ExternalSearchQuery
        modelBuilder.Entity<ExternalSearchQuery>(e =>
        {
            e.HasIndex(esq => esq.UserId);
            e.HasIndex(esq => esq.Provider);
            e.HasIndex(esq => esq.Status);
            e.HasIndex(esq => esq.CreatedAt);
            e.Property(esq => esq.Provider).HasMaxLength(50).IsRequired();
            e.Property(esq => esq.Query).HasMaxLength(500).IsRequired();
            e.Property(esq => esq.Status).HasMaxLength(20).IsRequired();
            e.Property(esq => esq.Filters).HasColumnType("jsonb");
            e.Property(esq => esq.Results).HasColumnType("jsonb");
            e.HasOne(esq => esq.User).WithMany().HasForeignKey(esq => esq.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Incident
        modelBuilder.Entity<Incident>(e =>
        {
            e.HasIndex(i => i.CountryCode);
            e.HasIndex(i => i.Status);
            e.HasIndex(i => i.CreatedAt);
            e.HasOne(i => i.Country).WithMany().HasForeignKey(i => i.CountryCode);
            e.HasOne(i => i.ReportedByUser).WithMany().HasForeignKey(i => i.ReportedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(i => i.AssignedToUser).WithMany().HasForeignKey(i => i.AssignedToUserId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}

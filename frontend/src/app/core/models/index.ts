export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  countryCode: string;
  countryName: string;
  preferredLanguage: string;
  roles: string[];
  createdAt?: string;
}

export interface NewsSearchRequest {
  query?: string;
  country?: string;
  category?: string;
  threatType?: string;
  minThreatLevel?: number;
  maxThreatLevel?: number;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export interface NewsArticleDto {
  id: string;
  title: string;
  summary?: string;
  url: string;
  imageUrl?: string;
  sourceName: string;
  language: string;
  publishedAt: string;
  countryTags: string[];
  categories: string[];
  threatType?: string;
  threatLevel: number;
  credibilityScore: number;
  voteStats?: VoteStatsDto;
  entities: EntityDto[];
}

export interface NewsDetailDto extends NewsArticleDto {
  body: string;
  userVote?: string;
}

export interface VoteStatsDto {
  realCount: number;
  misleadingCount: number;
  unsureCount: number;
}

export interface EntityDto {
  name: string;
  type: string;
}

export interface NewsSearchResult {
  items: NewsArticleDto[];
  total: number;
  facets: { [key: string]: FacetBucket[] };
}

export interface FacetBucket {
  key: string;
  count: number;
}

export interface TrendResult {
  topCategories: FacetBucket[];
  topEntities: FacetBucket[];
  topCountries: FacetBucket[];
  threatDistribution: ThreatLevelBucket[];
}

export interface ThreatLevelBucket {
  level: number;
  count: number;
}

export interface CastVoteRequest {
  articleId: string;
  voteType: string;
  reason?: string;
}

export interface VoteDto {
  id: number;
  articleId: string;
  voteType: string;
  reason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBulletinRequest {
  title: string;
  content: string;
  severity: number;
  category?: string;
}

export interface UpdateBulletinRequest {
  title?: string;
  content?: string;
  severity?: number;
  category?: string;
}

export interface BulletinDto {
  id: string;
  title: string;
  content: string;
  countryCode: string;
  status: string;
  severity: number;
  category?: string;
  createdByName: string;
  publishedByName?: string;
  createdAt: string;
  publishedAt?: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  category?: string;
  threatType?: string;
  minThreatLevel: number;
  keywords?: string;
}

export interface AlertRuleDto {
  id: number;
  name: string;
  countryCode: string;
  category?: string;
  threatType?: string;
  minThreatLevel: number;
  keywords?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AlertDto {
  id: number;
  title: string;
  message: string;
  severity: number;
  countryCode: string;
  isActive: boolean;
  createdAt: string;
  articleId?: string;
  acknowledgedAt?: string;
}

export interface CreateSourceRequest {
  type: string;
  name: string;
  url: string;
  countryCode?: string;
  language?: string;
  fetchIntervalMinutes: number;
}

export interface SourceDto {
  id: number;
  type: string;
  name: string;
  url: string;
  countryCode?: string;
  language?: string;
  isActive: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt?: string;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  fullName: string;
  countryCode: string;
  countryName: string;
  preferredLanguage: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserListResult {
  items: UserDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  countryCode: string;
  preferredLanguage: string;
  roles: string[];
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  countryCode?: string;
  preferredLanguage?: string;
  isActive?: boolean;
  roles?: string[];
}

export interface CountryDto {
  code: string;
  name: string;
  nameArabic: string;
  region: string;
}

export interface UserProfileDto {
  id: number;
  userId: string;
  bio?: string;
  avatarUrl?: string;
  organization?: string;
  jobTitle?: string;
  phoneNumber?: string;
  linkedInUrl?: string;
  twitterHandle?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateUserProfileRequest {
  bio?: string;
  organization?: string;
  jobTitle?: string;
  phoneNumber?: string;
  linkedInUrl?: string;
  twitterHandle?: string;
}

export interface BookmarkDto {
  id: number;
  userId: string;
  articleId: string;
  collectionId?: number;
  collectionName?: string;
  notes?: string;
  createdAt: string;
  article?: NewsArticleDto;
}

export interface BookmarkCollectionDto {
  id: number;
  userId: string;
  name: string;
  description?: string;
  color: string;
  bookmarkCount: number;
  createdAt: string;
}

export interface CreateBookmarkRequest {
  articleId: string;
  collectionId?: number;
  notes?: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  color: string;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  color?: string;
}

export interface BookmarkListResult {
  items: BookmarkDto[];
  total: number;
  page: number;
  pageSize: number;
}

// Experience/XP System Models
export interface UserExperienceDto {
  userId: string;
  totalXp: number;
  level: number;
  levelName: string;
  currentLevelXp: number;
  nextLevelXp: number;
  lastActivityAt: string;
}

export interface BadgeDto {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  requiredCount: number;
  rarity: string;
}

export interface UserBadgeDto {
  id: number;
  badgeId: number;
  badgeName: string;
  badgeDescription: string;
  badgeIconUrl: string;
  category: string;
  rarity: string;
  progress: number;
  requiredCount: number;
  isUnlocked: boolean;
  earnedAt: string;
}

export interface LeaderboardEntryDto {
  userId: string;
  username: string;
  fullName: string;
  countryCode: string;
  totalXp: number;
  level: number;
}

export interface ActivityLogDto {
  id: number;
  activityType: string;
  xpAwarded: number;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

export interface ActivityHistoryResult {
  items: ActivityLogDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AwardXpRequest {
  activityType: string;
  customXpAmount?: number;
  entityType?: string;
  entityId?: string;
  metadata?: string;
}

// Search Models
export interface SavedSearchDto {
  id: number;
  userId: string;
  name: string;
  description?: string;
  query: string;
  category?: string;
  threatType?: string;
  minThreatLevel?: number;
  countryCode?: string;
  sortBy?: string;
  isPublic: boolean;
  executionCount: number;
  lastExecutedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSavedSearchRequest {
  name: string;
  description?: string;
  query: string;
  category?: string;
  threatType?: string;
  minThreatLevel?: number;
  countryCode?: string;
  sortBy?: string;
  isPublic?: boolean;
}

export interface UpdateSavedSearchRequest {
  name?: string;
  description?: string;
  query?: string;
  category?: string;
  threatType?: string;
  minThreatLevel?: number;
  countryCode?: string;
  sortBy?: string;
  isPublic?: boolean;
}

export interface KeywordListDto {
  id: number;
  userId: string;
  name: string;
  description?: string;
  keywords: string[];
  category: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateKeywordListRequest {
  name: string;
  description?: string;
  keywords: string[];
  category?: string;
  isPublic?: boolean;
}

export interface UpdateKeywordListRequest {
  name?: string;
  description?: string;
  keywords?: string[];
  category?: string;
  isPublic?: boolean;
}

export interface ParseQueryRequest {
  query: string;
}

export interface ParseQueryResponse {
  originalQuery: string;
  isValid: boolean;
  validationError?: string;
  hasAdvancedSyntax: boolean;
  openSearchQuery: string;
  fieldSearches: { [key: string]: string[] };
  phrases: string[];
  terms: string[];
}

// Import Models
export interface ImportJobDto {
  id: number;
  fileName: string;
  importType: string;
  status: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  errorMessage?: string;
  errorDetails?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progressPercent: number;
}

export interface ImportTemplateType {
  type: 'articles' | 'users' | 'sources' | 'keywords';
  label: string;
  description: string;
  requiredRole?: string;
}

// DNS Models
export interface DnsLookupDto {
  id: number;
  domain: string;
  aRecords: string[];
  mxRecords: string[];
  txtRecords: string[];
  nsRecords: string[];
  whoisRegistrar?: string;
  whoisCreatedDate?: string;
  whoisExpirationDate?: string;
  whoisOrganization?: string;
  whoisCountry?: string;
  ipAddress?: string;
  ipCountry?: string;
  ipCity?: string;
  ipIsp?: string;
  riskScore: number;
  riskFactors: string[];
  isSuspicious: boolean;
  lookedUpAt: string;
}

export interface DnsLookupRequest {
  domain: string;
}

export interface DomainWatchlistDto {
  id: number;
  domain: string;
  description?: string;
  status: string;
  riskLevel: number;
  tags: string[];
  notes?: string;
  addedByUserId: string;
  addedByUsername?: string;
  countryCode?: string;
  detectionCount: number;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWatchlistEntryRequest {
  domain: string;
  description?: string;
  status?: string;
  riskLevel: number;
  tags?: string[];
  notes?: string;
  countryCode?: string;
}

export interface UpdateWatchlistEntryRequest {
  description?: string;
  status?: string;
  riskLevel?: number;
  tags?: string[];
  notes?: string;
}

// External Search Models
export interface ExternalSearchItem {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  source: string;
  publishedAt: string;
  engagementCount: number;
  metadata: { [key: string]: any };
}

export interface ExternalSearchResult {
  success: boolean;
  provider: string;
  query: string;
  items: ExternalSearchItem[];
  totalResults: number;
  errorMessage?: string;
  searchedAt: string;
}

export interface ExternalSearchQueryDto {
  id: number;
  provider: string;
  query: string;
  status: string;
  resultsCount: number;
  results?: ExternalSearchItem[];
  errorMessage?: string;
  createdAt: string;
  executedAt?: string;
  completedAt?: string;
}

export interface ExternalSearchFilters {
  fromDate?: string;
  toDate?: string;
  language?: string;
  maxResults?: number;
  twitterUsername?: string;
  twitterVerifiedOnly?: boolean;
  redditSubreddit?: string;
  redditSortBy?: string;
  newsApiSources?: string;
  newsApiDomains?: string;
}

export interface ExternalSearchRequest {
  provider: string;
  query: string;
  filters?: ExternalSearchFilters;
}

export interface MultiProviderSearchRequest {
  providers: string[];
  query: string;
  filters?: ExternalSearchFilters;
}

export interface ProviderInfo {
  name: string;
  isConfigured: boolean;
  isAvailable: boolean;
}

// Dashboard Summary
export interface DashboardSummaryDto {
  totalArticles: number;
  totalAlerts: number;
  activeAlerts: number;
  avgThreatLevel: number;
  articlesBySource: SourceCountDto[];
  topCountries: FacetBucketDto[];
  topCategories: FacetBucketDto[];
  threatDistribution: ThreatLevelDistDto[];
  recentTimeline: TimelinePointDto[];
  osintSources: OsintSourceInfoDto[];
}

export interface SourceCountDto {
  sourceName: string;
  sourceType: string;
  count: number;
}

export interface FacetBucketDto {
  key: string;
  count: number;
}

export interface ThreatLevelDistDto {
  level: number;
  count: number;
  label: string;
}

export interface TimelinePointDto {
  date: string;
  count: number;
}

export interface OsintSourceInfoDto {
  name: string;
  type: string;
  url: string;
  description: string;
  isActive: boolean;
  articleCount: number;
  lastFetchedAt?: string;
}

// Stats / GIS Map Models
export interface CountryStatsDto {
  countryCode: string;
  name: string;
  nameArabic: string;
  region: string;
  alertCount: number;
  articleCount: number;
  avgThreatLevel: number;
  maxThreatLevel: number;
  activeAlertCount: number;
}

export interface ThreatActivityDto {
  id: number;
  type: string;
  title: string;
  severity: number;
  sourceCountryCode: string;
  targetCountryCode: string;
  timestamp: string;
  category: string;
}

export interface TimelineBucketDto {
  date: string;
  countryCode: string;
  alertCount: number;
  articleCount: number;
  avgThreatLevel: number;
}

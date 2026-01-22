export interface Article {
  id: string;
  title: string;
  source: string;
  author?: string;
  timeAgo: string;
  date: string;
  isRead: boolean;
  body?: string;
  url?: string; // For real articles
  publishedAt?: string; // ISO date for real articles
  sourceDomain?: string; // Domain extracted from URL
}

export interface ArticleSummary {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  sourceName: string;
  sourceDomain: string;
}

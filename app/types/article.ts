export interface Article {
  id: string;
  title: string;
  source: string;
  author?: string;
  timeAgo: string;
  date: string;
  isRead: boolean;
  body: string;
}

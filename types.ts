
export interface Episode {
  id: string;
  title: string;
  videoUrl: string; // Default/Fallback
  thumbnail: string;
  season?: string;
}

export interface Anime {
  id: string;
  title: string;
  genre: string;
  year: string;
  status: string;
  description: string;
  poster: string;
  isTrending: boolean;
  type: 'Anime' | 'WebSeries';
  language?: string;
  episodes: Episode[];
}

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  animeId?: string;
}

export interface BackupData {
  anime: Anime[];
  banners: Banner[];
  logo: string;
  timestamp: number;
}

export interface HistoryItem {
  animeId: string;
  animeTitle: string;
  animePoster: string;
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  timestamp: number;
}

export interface Comment {
  id: string;
  userName: string;
  text: string;
  timestamp: number;
  userId?: string;
}
export interface Track {
  name: string;
  artist: { "#text": string; mbid?: string };
  url: string;
  image?: Array<{ "#text": string; size: string }>;
  mbid?: string;
}

export interface DatabaseTrack {
  id: number;
  track: {
    id: number;
    name: string;
    image: string;
    url: string;
    artist: {
      id: number;
      name: string;
    };
    album?: {
      id: number;
      title: string;
      image: string;
    };
  };
  date?: string;
}

export interface RecentTrack {
  id: number;
  playedAt: string;
  track: {
    id: number;
    name: string;
    image: string;
    url: string;
    artist: {
      id: number;
      name: string;
    };
    album?: {
      id: number;
      title: string;
      image: string;
    };
  };
}

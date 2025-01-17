export { User, Anime, MalAnime, RoomOptions, Room };

// Types
interface User {
  id: string | number; // discord id
  score?: number;
  list?: Anime[];
  guess?: number;
  global_name?: string; // discord global name
}

interface Anime {
  id: number;
  title: string;
  splash: string;
}

interface MalAnime {
  id: number;
  title: string;
  main_picture: {
    medium: string;
    large: string;
  };
}

interface RoomOptions {
  themeType: string;
  guessTime: number;
  queueSize: number;
  guessType: number;
  guessesCount: number;
}

interface Room {
  users: Record<string, User>;
  queue: number[];
  queueHistory: number[];
  playing: boolean;
  paused: boolean;
  canPlayNext: boolean;
  gameState: string;
  host: string;
  currentTimeout: NodeJS.Timeout | null;
  chathistory: string;
  animeList: Anime[];
  options: RoomOptions;
}

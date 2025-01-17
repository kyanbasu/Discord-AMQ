import { Socket } from "socket.io";

// Interfaces/Types
export { User, DiscordUser, Anime, MalAnime, RoomOptions, Room };

// Enums
export { GameState, ThemeType };

// Types
interface DiscordUser {
  id: number; // discord id
  avatar: string; // discord avatar
  global_name: string; // discord global name
}

interface User {
  id: number; // discord id
  discord?: DiscordUser;
  name?: string;
  socket?: Socket;
  roomID?: string;
  list?: Anime[];
  guess?: number;
  score?: number;
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

enum ThemeType {
  OP,
  ED,
  ALL,
}

interface RoomOptions {
  themeType: ThemeType;
  guessTime: number;
  queueSize: number;
  guessesCount: number;
}

enum GameState {
  LOBBY,
  PLAYING,
}

interface Room {
  users: number[];
  queue: number[];
  queueHistory: number[];
  playerPaused: boolean;
  canPlayNext: boolean;
  gameState: GameState;
  hostID: number;
  currentTimeout: NodeJS.Timeout | null;
  chathistory: string;
  options: RoomOptions;
}

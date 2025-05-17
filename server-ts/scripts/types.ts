import { Socket } from "socket.io";

// Interfaces/Types
export { User, DiscordUser, RoomOptions, Room };

// Enums
export { GameState, ThemeType };

// Types
interface DiscordUser {
  id: string; // discord id
  avatar: string; // discord avatar
  global_name: string; // discord global name
}

interface User {
  id: string; // discord id
  name?: string;
  socket?: Socket;
  roomID?: string;
  list?: string[];
  guess?: number;
  score: number;
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
  novideo: boolean; // if video is disabled on the server
}

enum GameState {
  LOBBY,
  PLAYING,
}

interface Room {
  users: string[];
  queue: string[];
  queueHistory: string[];
  playerPaused: boolean; // if player is (to be) paused
  playerPlaying: boolean; // if player is currently playing
  canPlayNext: boolean; // if you can skip song
  gameState: GameState;
  hostID: string;
  currentTimeout: NodeJS.Timeout | null;
  chathistory: string;
  options: RoomOptions;
}

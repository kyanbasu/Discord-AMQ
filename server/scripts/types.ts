import { Socket } from "socket.io";

// Interfaces/Types
export { User, DiscordUser, RoomOptions, Room, QueueEntry, TitlePair, Guess };

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
  playerListIncluded: Record<string, boolean>;
  novideo: boolean; // if video is disabled on the server
}

enum GameState {
  LOBBY,
  PLAYING,
}

interface QueueEntry {
  themeId: string;
  userId: string | undefined;
}

interface TitlePair {
  en: string; // English
  ro: string; // Romaji
  ja: string; // Japanese (or native)
}

interface Guess extends TitlePair {
  themeId: string;
}

interface Room {
  users: string[];
  queue: QueueEntry[]; // list of animes in queue
  queueHistory: QueueEntry[]; // list of animes that have been played or are to be played
  playerPaused: boolean; // if player is (to be) paused
  playerPlaying: boolean; // if player is currently playing
  canPlayNext: boolean; // if you can skip song
  gameState: GameState;
  hostID: string;
  currentTimeout: NodeJS.Timeout | null;
  chathistory: string;
  options: RoomOptions;
}

import * as mongoose from "mongoose";
import { TitlePair } from "./types";

// User
const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    username: { type: String, required: false }, //myanimelist & anilist
    service: { type: Number, required: false }, // 0 - MyAnimeList, 1 - AniList
    updated: { type: Number, required: true },
    list: { type: [String], required: true },
  },
  {
    methods: {},
  }
);

export type UserSchema = mongoose.InferSchemaType<typeof userSchema>;
export const UserSchema = mongoose.model("User", userSchema);

// Anime
const TitleSchema = new mongoose.Schema<TitlePair>(
  {
    en: { type: String, required: false }, // English
    ja: { type: String, required: false }, // Japanese (or native)
    ro: { type: String, required: true }, // Romaji (is fallback for others)
  },
  { _id: false }
);

const animeSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: TitleSchema, required: true },
    splash: { type: String, required: true },
  },
  {
    methods: {},
  }
);

export type AnimeSchema = mongoose.InferSchemaType<typeof animeSchema>;
export const AnimeSchema = mongoose.model("Anime", animeSchema);

import * as mongoose from "mongoose";

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
const animeSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    splash: { type: String, required: true },
  },
  {
    methods: {},
  }
);

export type AnimeSchema = mongoose.InferSchemaType<typeof animeSchema>;
export const AnimeSchema = mongoose.model("Anime", animeSchema);

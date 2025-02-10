import { AnimeSchema, UserSchema } from "./schema";
import config from "../config.json";
import * as mongoose from "mongoose";

export const initdb = async () => {
  // Mongoose: the `strictQuery` option will be switched back to `false` by default in Mongoose 7.
  mongoose.set("strictQuery", false);

  await mongoose.connect(config.mongoPath);
};

export const updateUser = async (
  userId: string,
  name: string,
  animes: AnimeSchema[],
  malname?: string,
  aniname?: string
) => {
  let userData: UserSchema = {
    _id: userId,
    name: name,
    updated: Date.now(),
    list: animes.map((a) => a._id),
    malname: malname,
    aniname: aniname,
  };
  try {
    await UserSchema.findOneAndUpdate(
      { _id: userData._id }, // Find by ID
      { $set: userData }, // Update fields
      { upsert: true, new: true } // Create if not exists, return updated document
    );
  } catch (error) {
    console.error("Error updating or creating user:", error);
    throw error;
  }

  await updateAnimes(animes);
};

export const updateAnimes = async (animes: AnimeSchema[]) => {
  if (!Array.isArray(animes) || animes.length === 0) {
    throw new Error("Invalid input: animeArray must be a non-empty array.");
  }

  try {
    const bulkOps = animes.map((anime) => ({
      updateOne: {
        filter: { _id: anime._id }, // Find by ID
        update: { $set: anime }, // Update fields
        upsert: true, // Insert if not found
      },
    }));

    const result = await AnimeSchema.bulkWrite(bulkOps);
    return result;
  } catch (error) {
    console.error("Error updating or creating animes:", error);
    throw error;
  }
};

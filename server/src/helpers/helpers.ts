import dotenv from "dotenv";
import FileManager from "../fileManager";
dotenv.config({ path: "../.env" });

export { fileManager };

const fileManager = new FileManager();

/* Randomize array in-place using Durstenfeld shuffle algorithm */
export const shuffleArray = (array: unknown[]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
};

export const randomFromArray = (array: unknown[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

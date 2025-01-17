import { db } from "../server";
import { Anime, User } from "./types";

export const initdb = () => {
  db.run(`
        CREATE TABLE IF NOT EXISTS anime (
            id INTEGER PRIMARY KEY,
            title TEXT,
            splash TEXT
        );
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT,
            updated INTEGER
        );
    `);

  db.run(`
        CREATE TABLE IF NOT EXISTS user_anime (
          user_id INTEGER NOT NULL,
          anime_id INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (anime_id) REFERENCES anime(id)
        );
    `);
};

export const getUser = (userId: number, withAnimeList: boolean = false) => {
  let user = db
    .query(
      `
      SELECT id, name, updated
      FROM users
      WHERE id = ?
  `
    )
    .get(userId) as User | undefined;

  if (user && withAnimeList) user.list = getUserAnimeList(userId);

  return user;
};

export const getUserAnimeList = (userId: number) => {
  const userAnime = db
    .query(
      `
        SELECT anime.id, anime.title, anime.splash
        FROM anime
        JOIN user_anime ON anime.id = user_anime.anime_id
        WHERE user_anime.user_id = ?
    `
    )
    .all(userId) as Anime[];

  return userAnime;
};

export const updateUser = (
  userId: number | string,
  name: string,
  animes: Anime[]
) => {
  userId = Number(userId);

  const insertUser = db.prepare(
    "INSERT OR REPLACE INTO users (id, name, updated) VALUES (?, ?, ?)"
  );
  insertUser.run(userId, name, Date.now());

  linkUserAnimes(userId, animes);
};

export const linkUserAnimes = (userId: number, animes: Anime[]) => {
  const replaceUserAnimeTransaction = db.transaction(() => {
    // Clear user-anime relations
    db.run("DELETE FROM user_anime WHERE user_id = ?", [userId]);

    const insertUserAnime = db.prepare(`
                INSERT OR IGNORE INTO user_anime (user_id, anime_id) VALUES (?, ?)
            `);

    animes.forEach((anime) => {
      insertUserAnime.run(userId, anime.id);
    });
  });

  replaceUserAnimeTransaction();

  insertAnimes(animes);
};

export const insertAnimes = (animes: Anime[]) => {
  const insertAnimesTransaction = db.transaction(() => {
    const stmt = db.prepare(`
            INSERT OR IGNORE INTO anime (id, title, splash)
            VALUES (?, ?, ?)
        `);

    animes.forEach((anime: Anime) => {
      stmt.run(anime.id, anime.title, anime.splash);
    });
  });

  insertAnimesTransaction();
};

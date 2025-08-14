import { runningLocally } from "../../constants";
import { AnimeSchema } from "../db/schemas";
import { AudioUrl, ThemeType } from "../types";
import { fileManager } from "./helpers";

interface Video {
  id: number;
  basename: string;
  filename: string;
  size: number;
  link: string;
  audio: {
    id: number;
    basename: string;
    filename: string;
    size: number;
    link: string;
  };
}

interface AnimeThemeEntry {
  id: number;
  nsfw: boolean;
  spoiler: boolean;
  videos: Video[];
}

interface AnimeTheme {
  id: number;
  slug: string;
  type: string;
  animethemeentries: AnimeThemeEntry[];
}

interface AnimeResponse {
  anime: [{ animethemes: AnimeTheme[]; name: string }];
}

export function getTheme(
  themeId: string,
  themeType: ThemeType = ThemeType.ALL
): Promise<AudioUrl> {
  return new Promise((resolve, reject) => {
    if (runningLocally) {
      const baseName = `${themeId}-OP1`;
      const o: AudioUrl = {
        link: baseName,
        themeId: themeId,
        themeType: "OP",
      };
      (async () => {
        fileManager
          .cache(["webm", "ogg", "jpg"], baseName)
          .then(() => {
            return resolve(o);
          })
          .catch((e) => {
            return reject(e);
          });
      })();
    }

    fetch(
      `https://api.animethemes.moe/anime?filter[has]=resources&include=resources&filter[site]=Anilist&filter[external_id]=${themeId}&include=animethemes.animethemeentries.videos.audio`
    )
      .then((response) => response.json() as Promise<AnimeResponse>)
      .then(async (obj: AnimeResponse) => {
        if (obj.anime[0] == undefined)
          return reject(new Error("Error no anime found"));

        let _themes;
        if (themeType == ThemeType.ALL) _themes = obj.anime[0].animethemes;
        else
          _themes = obj.anime[0].animethemes.filter(
            (e: AnimeTheme) => e.type == ThemeType[themeType]
          );

        if (_themes.length == 0) return reject(new Error("No themes found"));
        const entry = _themes[Math.floor(_themes.length * Math.random())];
        const baseName = `${themeId}-${entry.slug}`;

        const o: AudioUrl = {
          link: baseName,
          themeId: themeId,
          themeType: entry.slug,
        };

        const vidUrl = entry.animethemeentries[0].videos[0].link;
        const audioUrl = entry.animethemeentries[0].videos[0].audio.link;
        const imgUrl = await AnimeSchema.findOne({ _id: themeId }).then(
          (res) => {
            if (res) return res.splash;
            return "";
          }
        );

        //console.log(`> Downloading ${vidUrl} (${baseName})`);
        try {
          await fileManager.cache([vidUrl, audioUrl, imgUrl], baseName);
          return resolve(o);
        } catch (error) {
          console.error(`Error downloading files (${baseName}): ${error}`);
        }

        return reject(new Error("Error downloading files"));
      })
      .catch((e) => {
        console.error(`Error fetching audio URL: ${e}`);
        return reject(new Error(`Error fetching audio URL: ${e}`));
      });
  });
}

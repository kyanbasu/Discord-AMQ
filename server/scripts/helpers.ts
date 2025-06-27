//import fs from "node:fs";
import { join, basename, extname } from "path";

import { AnimeSchema } from "./schema";
import { ThemeType } from "./types";
import { privateEncrypt } from "crypto";

/* Randomize array in-place using Durstenfeld shuffle algorithm */
export const shuffleArray = (array: any[]) => {
  for (var i = array.length - 1; i >= 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
};

export const randomFromArray = (array: any[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

export async function downloadFile(
  url: string,
  outputName: string
): Promise<string> {
  if (Bun.argv.includes("--no-video") && url.endsWith(".webm")) {
    return "../client/undefined.jpg";
  }
  // Fetch the file
  const response = await fetch(url);

  // Determine extension...
  const urlObj = new URL(url);
  const originalName = basename(urlObj.pathname);
  let extension = extname(originalName);

  if (extension === ".webp" || extension === ".png") {
    extension = ".jpg";
  }
  // catch errors
  if (!response.ok) {
    if (extension === ".jpg") return "../client/undefined.jpg"; // return undefined image
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`
    );
  }

  // ...and filename
  const filename = `${outputName}${extension}`;
  const destPath = join("../client/res", filename);

  // Read as ArrayBuffer and write to disk
  const arrayBuffer = await response.arrayBuffer();
  await Bun.write(destPath, new Uint8Array(arrayBuffer));

  return destPath;
}

export async function downloadMediaBatch(
  urls: string[],
  outputBaseName: string
): Promise<string> {
  // Kick off all three downloads concurrently, using the same base name
  const downloads = urls.map((url) => downloadFile(url, outputBaseName));

  console.log("Downloading files:");
  console.log(urls);

  // Wait for all to complete
  await Promise.all(downloads);

  // Return the shared base filename
  return outputBaseName;
}

interface AnimeResponse {
  anime: [{ animethemes: any; name: string }];
}

interface AudioUrl {
  link: string;
  name: string;
  themeType: string;
}

export const getAudioUrl: (
  malID: string,
  themeType: ThemeType
) => Promise<AudioUrl> = (malID, themeType = ThemeType.ALL) => {
  return new Promise((resolve, reject) => {
    fetch(
      `https://api.animethemes.moe/anime?filter[has]=resources&include=resources&filter[site]=MyAnimeList&filter[external_id]=${malID}&include=animethemes.animethemeentries.videos.audio`
    )
      .then((response) => response.json() as Promise<AnimeResponse>)
      .then(async (obj: AnimeResponse) => {
        if (obj.anime[0] == undefined)
          return reject(new Error("Error no anime found"));

        let _themes;
        if (themeType == ThemeType.ALL) _themes = obj.anime[0].animethemes;
        else
          _themes = obj.anime[0].animethemes.filter(
            (e: any) => e.type == ThemeType[themeType]
          );

        if (_themes.length == 0) return reject(new Error("No themes found"));
        const entry = _themes[Math.floor(_themes.length * Math.random())];
        const baseName = `${malID}-${entry.slug}`;

        const o: AudioUrl = {
          link: `${baseName}`,
          name: obj.anime[0].name,
          themeType: entry.slug,
        };

        if (await Bun.file(`../client/res/${baseName}.jpg`).exists()) {
          return resolve(o);
        }

        const vidUrl = entry.animethemeentries[0].videos[0].link;
        const audioUrl = entry.animethemeentries[0].videos[0].audio.link;
        const imgUrl = await AnimeSchema.findOne({ _id: malID }).then((res) => {
          if (res) return res.splash;
          return undefined;
        });

        //console.log(`> Downloading ${vidUrl} (${baseName})`);
        try {
          var start = Date.now();
          const result = await downloadMediaBatch(
            [vidUrl, audioUrl, imgUrl],
            baseName
          );
          console.log(`Downloaded files with base name: ${result}`);
          console.log(`Time taken batch: ${Date.now() - start}ms`);
          requestDeletion(baseName);
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
};

function requestDeletion(baseName: string) {
  setTimeout(async () => {
    console.log(`Deleting ${baseName} files`);
    ["webm", "ogg", "jpg"].forEach(async (ext) => {
      const res = Bun.file(`../client/res/${baseName}.${ext}`);
      if (await res.exists()) {
        await res.delete();
      }
    });
  }, 120_000);
}

interface MAL {
  data: [
    {
      node: {
        id: string;
        title: string;
        main_picture: { medium: string; large: string };
      };
    }
  ];
}

interface AniList {
  data: {
    MediaListCollection: {
      lists: {
        name: string;
        entries: {
          media: {
            id: number;
            idMal: number;
            title: {
              english: string;
            };
            coverImage: {
              extraLarge: string;
            };
          };
        }[];
      }[];
    };
  };
}

export const getAnimeList: (
  ID: string,
  service: number
) => Promise<AnimeSchema[]> = async (
  ID: string,
  service: number // 0 for MAL, 1 for AniList
) => {
  switch (service) {
    case 0:
      try {
        const res = await fetch(
          `https://api.myanimelist.net/v2/users/${ID}/animelist?limit=1000&status=watching&status=completed`,
          { headers: { "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID! } }
        );

        if (!res.ok) {
          throw new Error(
            `Failed to fetch MAL anime list. Status: ${res.status}`
          );
        }

        const json = (await res.json()) as MAL;
        const list: AnimeSchema[] = json.data.map(({ node }) => ({
          _id: node.id,
          title: node.title,
          splash: node.main_picture.large,
        }));

        return list;
      } catch (error) {
        if (error instanceof Error) console.error(error.message);
        throw new Error("Unable to fetch MAL anime list");
      }
    case 1:
      try {
        const res = await fetch(`https://graphql.anilist.co`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query: `
                query ($userName: String!, $statusIn: [MediaListStatus]) {
                MediaListCollection(type: ANIME, userName: $userName, status_in: $statusIn) {
                  lists {
                    name
                    entries {
                      media {
                        id
                        idMal
                        title {
                          english
                        }
                        coverImage {
                          extraLarge
                        }
                      }
                    }
                  }
                }
              }`,
            variables: {
              userName: ID,
              statusIn: ["CURRENT", "COMPLETED"]
            },
          }),
        });

        if (!res.ok) {
          throw new Error(
            `Failed to fetch AniList anime list. Status: ${res.status}`
          );
        }

        const json = await res.json() as AniList;
        const list: AnimeSchema[] = json.data.MediaListCollection.lists.flatMap((list) =>
          list.entries
            .filter((entry) => entry.media.idMal != null)
            .map((entry) => ({
              _id: entry.media.idMal.toString(),
              title: entry.media.title.english,
              splash: entry.media.coverImage.extraLarge,
            }))
        );

        return list;
      } catch (error) {
        if (error instanceof Error) console.error(error.message);
        throw new Error("Unable to fetch AniList anime list");
      }

    default:
      break;
  }
  throw new Error("Invalid service type.");
};

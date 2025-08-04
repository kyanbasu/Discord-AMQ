import { AnimeSchema } from "../db/schemas";

const anilistApiUrl = "https://graphql.anilist.co";

interface MAL {
  data: [
    {
      node: {
        id: string;
        title: string;
        main_picture: { medium: string; large: string };
        alternative_titles: {
          synonyms: string[];
          en: string;
          ja: string;
        };
      };
    }
  ];
}

interface AniListMedia {
  id: number;
  title: {
    english: string;
    romaji: string;
    native: string;
  };
  coverImage: {
    extraLarge: string;
  };
}

interface AniList {
  data: {
    MediaListCollection: {
      lists: {
        name: string;
        entries: {
          media: AniListMedia;
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
        const resMAL = await fetch(
          `https://api.myanimelist.net/v2/users/${ID}/animelist?&limit=1000&status=watching&status=completed`,
          { headers: { "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID! } }
        );

        if (!resMAL.ok) {
          throw new Error(
            `Failed to fetch MAL anime list. Status: ${resMAL.status}`
          );
        }

        const jsonMAL = (await resMAL.json()) as MAL;

        const ids: number[] = jsonMAL.data.map(({ node }) => Number(node.id));

        //const json = (await res.json()) as AniList;
        const anilist = await AniListPaginate(ids);

        const list: AnimeSchema[] = anilist.map((entry) => ({
          _id: entry.id.toString(),
          title: {
            en: entry.title.english,
            ro: entry.title.romaji,
            ja: entry.title.native,
          },
          splash: entry.coverImage.extraLarge,
        }));

        return list;
      } catch (error) {
        if (error instanceof Error) console.error(error.message);
        throw new Error("Unable to fetch MAL anime list");
      }
    case 1:
      try {
        const res = await fetch(anilistApiUrl, {
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
                        title {
                          english
                          romaji
                          native
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
              statusIn: ["CURRENT", "COMPLETED"],
            },
          }),
        });

        if (!res.ok) {
          throw new Error(
            `Failed to fetch AniList anime list. Status: ${res.status}`
          );
        }

        const json = (await res.json()) as AniList;
        const list: AnimeSchema[] = json.data.MediaListCollection.lists.flatMap(
          (list) =>
            list.entries
              .filter(
                (entry) =>
                  entry.media.id != null &&
                  entry.media.title.english != null &&
                  entry.media.coverImage.extraLarge != null
              )
              .map((entry) => ({
                _id: entry.media.id.toString(),
                title: {
                  en: entry.media.title.english,
                  ro: entry.media.title.romaji,
                  ja: entry.media.title.native,
                },
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

const AniListPaginate: (idsMal: number[]) => Promise<AniListMedia[]> = async (
  idsMal
) => {
  const perPage = 50; // max per AniList docs
  let page = 1;
  const allThemes: AniListMedia[] = [];

  while (true) {
    const res = await fetch(anilistApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: `
                query ($idsMal: [Int!]!, $page: Int!, $perPage: Int!) {
                  Page(page: $page, perPage: $perPage) {
                    pageInfo {
                      total
                      perPage
                      currentPage
                      lastPage
                      hasNextPage
                    }
                    media(type: ANIME, idMal_in: $idsMal) {
                      id
                      title {
                        english
                        romaji
                        native
                      }
                      coverImage {
                        extraLarge
                      }
                    }
                  }
                }`,
        variables: { idsMal, page, perPage },
      }),
    });

    if (!res.ok) {
      throw new Error(`AniList query failed: ${res.status} ${res.statusText}`);
    }

    const { data } = (await res.json()) as {
      data: {
        Page: {
          pageInfo: {
            hasNextPage: boolean;
          };
          media: AniListMedia[];
        };
      };
    };

    allThemes.push(...data.Page.media);

    if (!data.Page.pageInfo.hasNextPage) break;

    page++;
  }

  return allThemes;
};

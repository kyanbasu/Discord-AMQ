import { getAudioUrl } from "../scripts/helpers";

(globalThis as unknown as any).onmessage = async (event: any) => {

  try {
    const { url, themeType } = event.data;
    const result = await getAudioUrl(url, themeType);
    console.log(`Download complete`);
    console.log(result)
    postMessage({result})
  } catch (error: any) {
    console.error("Worker error: " + error.message);
  }
};
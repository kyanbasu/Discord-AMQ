import { join, basename, extname } from "path";

class FileManager {
  cacheDir: string;
  ttl: number;
  map: Map<string, { promise: Promise<string>; timer: ReturnType<typeof setTimeout> }>;

  constructor() {
    this.cacheDir = "../client/res";
    this.ttl = 120000;
    this.map = new Map(); // baseName -> { promise, timer }
  }

  cache(urls: string[], outputBaseName: string) {
    // If already downloading or cached, return existing promise
    if (this.map.has(outputBaseName)) {
      const entry = this.map.get(outputBaseName);
      // reset TTL
      if (!entry) return; //stupid typescript
      clearTimeout(entry.timer); // refresh timer
      entry.timer = this._makeExpiryTimer(outputBaseName);
      return entry.promise;
    }

    // Otherwise download the files
    const p = downloadMediaBatch(urls, outputBaseName);

    // Schedule its eviction
    const timer = this._makeExpiryTimer(outputBaseName);

    this.map.set(outputBaseName, { promise: p, timer });
    // When promise rejects or resolves, we keep the map entry until TTL
    p.catch(() => {}) // swallow here: let callers handle
      .finally(() => {
        /* could log success/failure */
      });

    return p;
  }

  _makeExpiryTimer(baseName: string) {
    return setTimeout(async () => {
      console.log(`Deleting ${baseName} files`);
      this.map.delete(baseName);
      ["webm", "ogg", "jpg"].forEach(async (ext) => {
        const res = Bun.file(`../client/res/${baseName}.${ext}`);
        if (await res.exists()) {
          await res.delete();
        }
      });
    }, this.ttl);
  }
}

async function downloadFile(url: string, outputName: string): Promise<string> {
  if (Bun.argv.includes("--no-video") && url.endsWith(".webm")) {
    return "../client/undefined.jpg";
  }
  // Fetch the file
  const response = await fetch(url);

  // Determine extension...
  const urlObj = new URL(url);
  const originalName = basename(urlObj.pathname);
  let extension = extname(originalName);

  if (extension === ".webp") {
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

async function downloadMediaBatch(
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

export default FileManager;

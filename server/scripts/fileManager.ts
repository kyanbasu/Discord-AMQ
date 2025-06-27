import { join, basename, extname } from "path";

class FileManager {
  cacheDir: string;
  undefinedImage: string;
  ttl: number;
  map: Map<
    string,
    { promise: Promise<string>; timer: ReturnType<typeof setTimeout> }
  >;

  constructor(
    cacheDir: string = "../client/res",
    undefinedImage: string = "../client/undefined.jpg",
    ttl: number = 120000 // 2 minutes by default
  ) {
    this.cacheDir = cacheDir;
    this.undefinedImage = undefinedImage;
    this.ttl = ttl;
    this.map = new Map(); // baseName -> { promise, timer }
  }

  cache(urls: string[], outputBaseName: string) : Promise<string> {
    // If already downloading or cached, return existing promise
    if (this.map.has(outputBaseName)) {
      console.log(`Waiting for exisitng promise ${outputBaseName}`);
      const entry = this.map.get(outputBaseName);
      if (entry) { // stupid typescript checking for second time
        // reset TTL
        clearTimeout(entry.timer); // refresh timer
        entry.timer = this._makeExpiryTimer(outputBaseName);
        return entry.promise;
      }
    }

    // Otherwise download the files
    const p = this.downloadMediaBatch(urls, outputBaseName);

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
        const res = Bun.file(join(this.cacheDir, `${baseName}.${ext}`));
        if (await res.exists()) {
          await res.delete();
        }
      });
    }, this.ttl);
  }

  async downloadFile(url: string, outputName: string): Promise<string> {
    if (Bun.argv.includes("--no-video") && url.endsWith(".webm")) {
      return this.undefinedImage;
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
      if (extension === ".jpg") return this.undefinedImage; // return undefined image
      throw new Error(
        `Failed to download ${url}: ${response.status} ${response.statusText}`
      );
    }

    // ...and filename
    const filename = `${outputName}${extension}`;
    const destPath = join(this.cacheDir, filename);

    // Read as ArrayBuffer and write to disk
    const arrayBuffer = await response.arrayBuffer();
    await Bun.write(destPath, new Uint8Array(arrayBuffer));

    return destPath;
  }

  async downloadMediaBatch(
    urls: string[],
    outputBaseName: string
  ): Promise<string> {
    // Kick off all three downloads concurrently, using the same base name
    const downloads = urls.map((url) => this.downloadFile(url, outputBaseName));

    console.log("Downloading files:");
    console.log(urls);

    // Wait for all to complete
    await Promise.all(downloads);

    // Return the shared base filename
    return outputBaseName;
  }
}

export default FileManager;

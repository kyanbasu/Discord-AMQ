import * as Sentry from "@sentry/bun";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "unknown",
  sendDefaultPii: true,
  _experiments: { enableLogs: true },
});

import axios from "axios";
import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import fetch from "node-fetch";
import { app, port, server } from "./constants.ts";
import { initdb } from "./src/db/databaseManagement.ts";
import { fileManager } from "./src/helpers/helpers.ts";

initdb();

// Allow express to parse JSON bodies
app.use(express.json());
app.use(bodyParser.text({ type: ["text/*", "*/json"], limit: "50mb" }));

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1); // Crash the application
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
  process.exit(1); // Crash the application
});

// Express Routes
app.post("/api/token", async (req: Request, res: Response) => {
  try {
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: req.body.code,
      }),
    });

    const json = await response.json();

    const { access_token } = json as {
      access_token: string;
    };
    res.send({ access_token });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching token.");
  }
});

app.get("/media/:baseName/:type", (req: Request, res: Response) => {
  const { baseName, type } = req.params;

  const promise = fileManager.getPromise(baseName);

  if (!promise) {
    res.status(404).send("Media not found");
    return;
  }

  promise
    .then((result) => {
      const [webm, ogg, jpg] = result;

      let buffer: Buffer;
      let contentType: string;

      switch (type) {
        case "webm":
          buffer = webm;
          contentType = "video/webm";
          break;
        case "ogg":
          buffer = ogg;
          contentType = "audio/ogg";
          break;
        case "jpg":
          buffer = jpg;
          contentType = "image/jpg";
          break;
        default:
          res.status(400).send("Invalid media type");
          return;
      }

      const total = buffer.length;
      const range = req.headers.range; // e.g. "bytes=0-"
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", contentType);

      if (range) {
        // Range requested — parse and send partial content (206)
        const matches = /bytes=(\d*)-(\d*)/.exec(range);
        if (!matches) {
          res.status(416).send("Requested Range Not Satisfiable");
          return;
        }

        const start = matches[1] ? parseInt(matches[1], 10) : 0;
        const end = matches[2] ? parseInt(matches[2], 10) : total - 1;

        if (isNaN(start) || isNaN(end) || start > end || end >= total) {
          res
            .status(416)
            .setHeader("Content-Range", `bytes */${total}`)
            .send("Requested Range Not Satisfiable");
          return;
        }

        const chunk = buffer.slice(start, end + 1);
        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
        res.setHeader("Content-Length", String(chunk.length));
        res.send(chunk);
      } else {
        // No range → send entire file with a Content-Length
        res.status(200);
        res.setHeader("Content-Length", String(total));
        res.send(buffer);
      }
    })
    .catch((err) => {
      console.error(err);
      res.sendStatus(500);
    });
});

app.post(
  "/sentry-tunnel",

  async (req, res) => {
    try {
      let envelope = req.body;
      if (typeof envelope === "object") {
        envelope = JSON.stringify(envelope);
      }

      if (envelope === null || envelope == "{}") return;

      try {
        envelope.split("\n");
      } catch (e) {
        console.error(
          "Failed to split envelope: ",
          envelope,
          typeof envelope,
          e
        );
        Sentry.captureException(e);
        return;
      }

      const [headerLine] = envelope.split("\n");
      const header: { dsn: string } =
        typeof headerLine === "object" ? headerLine : JSON.parse(headerLine);
      const { host, pathname, username } = new URL(header.dsn);
      const projectId = pathname.slice(1);
      const url = `https://${host}/api/${projectId}/envelope/?sentry_key=${username}`;

      await axios.post(url, envelope, {
        headers: { "Content-Type": "application/x-sentry-envelope" },
      });

      res.status(200).end(); // or 201
    } catch (err: unknown) {
      console.error("Sentry Tunnel error:", err);
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : String(err) });
      Sentry.captureException(err);
    }
  }
);

app.get("/", (_req, res) => {
  res.send("working.");
});

server.listen(port, () => {
  console.log(`Server and Socket.io listening at http://localhost:${port}`);
});

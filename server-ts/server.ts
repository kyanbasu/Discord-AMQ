import express, { Request, Response } from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { addQueue, playNextQueue } from "./scripts/queueManagment.js";
import * as chat from "./scripts/chat.ts";
import { getAnimeList } from "./scripts/helpers.js";

dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;

const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: { origin: "discordsays.com" },
  });

// Types
interface User {
  id: string;
  score?: number;
  list?: Anime[];
  guess?: string;
}

interface Anime {
  id: number;
  title: string;
  splash: string;
}

interface RoomOptions {
  themeType: string;
  guessTime: number;
  queueSize: number;
  guessType: number;
  guessesCount: number;
}

interface Room {
  users: Record<string, User>;
  queue: number[];
  queueHistory: number[];
  playing: boolean;
  paused: boolean;
  canPlayNext: boolean;
  gameState: string;
  host: string;
  currentTimeout: NodeJS.Timeout | null;
  chathistory: string;
  animeList: Anime[];
  options: RoomOptions;
}

const skipTime = 70;

let rooms: Record<string, Room> = {};
let sockets: Record<string, string> = {};
let users: Record<string, { socket: Socket; roomID: string }> = {};
let alcache: Record<string, string> = {};

// Clean cache
fs.readdir("../client/res/", (err, files) => {
  if (err) throw err;

  for (const file of files) {
    console.log("removing cached " + path.join("../client/res/", file));
    fs.unlink(path.join("../client/res/", file), (err) => {
      if (err) throw err;
    });
  }
});

// Allow express to parse JSON bodies
app.use(express.json());

fs.readFile("./cache.json", (err, data) => {
  if (err) return console.error(err);
  alcache = JSON.parse(data.toString());
});

export { rooms, io };

io.on("connection", (socket) => {
  socket.on("message", (roomID: string, message: string) => {
    if (!message) return;

    if (message.includes("!play")) {
      return addQueue(socket, roomID, message.split(" ").at(-1) || "");
    }

    return chat.sendChatMessage(
      roomID,
      `> ${new Date().toLocaleString("en-GB", { hour12: false }).slice(
        12,
        17
      )} <span style="color:salmon">${message}</span>`
    );
  });

  socket.on("join-room", async (roomID: string, user: User) => {
    socket.join(roomID);
    user.score = 0;

    if (!rooms[roomID]) {
      rooms[roomID] = {
        users: {},
        queue: [],
        queueHistory: [],
        playing: false,
        paused: true,
        canPlayNext: true,
        gameState: "lobby",
        host: user.id,
        currentTimeout: null,
        chathistory: "",
        animeList: [],
        options: { themeType: "OP", guessTime: 10, queueSize: 10, guessType: 0, guessesCount: 4 },
      };

      rooms[roomID].users[user.id] = user;

      socket.emit("addAvatar", user, user.id === rooms[roomID].host);
    } else {
      Object.values(rooms[roomID].users).forEach((_user) => {
        socket.emit("addAvatar", _user, _user.id === rooms[roomID].host);
      });

      if (!rooms[roomID].users[user.id]) {
        rooms[roomID].users[user.id] = user;
        io.to(roomID).emit("addAvatar", user);
      }
      socket.emit("message", rooms[roomID].chathistory);
    }

    if (rooms[roomID].gameState === "playing") {
      socket.emit("message", "Dołączanie do trwającej gry...", "playing");
    }

    if (alcache[user.id]) {
      try {
        const list = await getAnimeList(alcache[user.id]);
        list.forEach((entry: Anime) => {
          if (!rooms[roomID].animeList.some((e) => e.id === entry.id)) {
            rooms[roomID].animeList.push({
              id: entry.id,
              title: entry.title,
              splash: entry.splash,
            });
          }
        });
        socket.emit("message", "Zaaktualizowano liste.", "list", alcache[user.id]);
        chat.userAnnouncement(socket, `Zaaktualizowano liste. (${list.length})`);
      } catch {
        socket.emit("message", "nie znaleziono takiego profilu MAL");
      }
    }
    socket.emit("optionsReload", rooms[roomID].options);
    sockets[socket.id] = user.id;
    users[user.id] = { socket: socket, roomID: roomID };
    //console.log(socket);
  });

  socket.on("updateAL", async (roomID: string, user: User, listID: string) => {
    if (rooms[roomID].gameState === "lobby") {
      try {
        const list = await getAnimeList(listID);
        const formattedList: Anime[] = list.map((entry: Anime) => ({
          id: entry.id,
          title: entry.title,
          splash: entry.splash,
        }));

        rooms[roomID].users[user.id].list = formattedList;
        alcache[user.id] = listID;

        fs.writeFileSync("./cache.json", JSON.stringify(alcache, null, 2), "utf-8");
        chat.userAnnouncement(socket, `Zaaktualizowano liste. (${formattedList.length})`);
      } catch {
        socket.emit("message", "Nie znaleziono takiego profilu MAL");
        chat.userAnnouncement(socket, "Nie znaleziono takiego profilu MAL");
      }
    } else {
      socket.emit("message", "Nie można zaaktualizować listy podczas gry!");
    }
  });

  socket.on('updateOptions', async (roomID, user, options) => {
      if(rooms[roomID] && user.id == rooms[roomID].host){
        console.log(options)
        rooms[roomID].options = options
        io.to(roomID).emit("optionsReload", rooms[roomID].options)
        chat.systemAnnouncement(roomID, "Zaaktualizowano opcje.")
      }
    })
  
    socket.on('addQueue', async (roomID, malID) => {
      addQueue(socket, roomID, malID)
      /*if(!rooms[roomID].canPlayNext) return socket.emit('message', 'You must wait to play next song')
      chat.sendChatMessage(roomID, `LOG> downloading ${malID}`)
      rooms[roomID].canPlayNext = false
      var audio = await getAudioUrl(malID, rooms[roomID].options.themeType).catch(error => console.error(error))
      io.to(roomID).emit('audio', audio.link)
      chat.sendChatMessage(roomID, `LOG> playing ${malID}.ogg`)
      setTimeout(() => {
        chat.sendChatMessage(roomID, `That was ${audio.name}`)
        rooms[roomID].canPlayNext = true
        setTimeout(() => {
          chat.sendChatMessage(roomID, `That was ${audio.name}`)
          rooms[roomID].canPlayNext = true
        }, 5000);
      }, 5000);*/
    })
  
  socket.on('playPause', async (roomID) => {
      if(!rooms[roomID]) return socket.emit('exit')
      if(rooms[roomID].paused){
        // pressed play
        if(rooms[roomID].gameState == 'lobby'){
          rooms[roomID].gameState = 'playing';
          chat.systemMessage(roomID, 'Gra rozpoczęta!', 'play')
          if(rooms[roomID].animeList.length > 0){
            for (let i = 0; i < rooms[roomID].options.queueSize; i++) {
              let randomPick = rooms[roomID].animeList[Math.floor(Math.random() * rooms[roomID].animeList.length)]
              rooms[roomID].queue.push(randomPick.id)
            }
          }
        }
        rooms[roomID].paused = false;
        if(rooms[roomID].gameState == 'playing') chat.systemMessage(roomID, 'Odpauzowane.', 'play')
        if(rooms[roomID].canPlayNext)
          await playNextQueue(roomID);
      } else {
        // pressed pause
        rooms[roomID].paused = true;
        chat.systemMessage(roomID, 'Zapauzuje po muzyce...', 'pause')
      }
  
    })
  
    socket.on('guess', async (user, roomID, guess) => {
      rooms[roomID].users[user.id].guess = guess
    })
  
    socket.on('skip', async (roomID) => {
      if(!rooms[roomID]) return socket.emit('exit')
      if(!rooms[roomID].paused && rooms[roomID].canPlayNext){
        clearTimeout(rooms[roomID].currentTimeout)
        rooms[roomID].playing = false
        rooms[roomID].currentTimeout = null
        rooms[roomID].canPlayNext = false
  
        await playNextQueue(roomID);
      }
    })
  
    socket.on('discord-auth', (user) => {
      console.log(user)
    })

  socket.on("disconnect", () => {
    console.log("user disconnected " + socket.id);
    const userId = sockets[socket.id];
    if (!userId) return;
    const userRoom = users[userId];
    if (userRoom) {
      const roomID = userRoom.roomID;
      delete rooms[roomID].users[userId];
      if (Object.keys(rooms[roomID].users).length === 0) {
        delete rooms[roomID];
      }
    }
    delete sockets[socket.id];
    delete users[userId];
  });
});

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

    const { access_token } = (await response.json()) as { access_token: string };
    res.send({ access_token });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching token.");
  }
});

app.get("/", (_req, res) => {
  res.send("working.");
});

server.listen(port, () => {
  console.log(`Server and Socket.io listening at http://localhost:${port}`);
});

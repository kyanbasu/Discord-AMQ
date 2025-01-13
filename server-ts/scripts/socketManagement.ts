import { Socket } from "socket.io";
import fs from "node:fs";

import { addQueue, playNextQueue } from "./queueManagment.js";
import * as chat from "./messaging.ts";
import { getAnimeList } from "./helpers.js";

import { alcache, sockets, users, io, rooms } from "../server.ts";
import { User, Anime } from "./types.ts";

export const connection = (socket: Socket) => {
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
            const list = await getAnimeList(alcache[user.id].id);
            
            rooms[roomID].animeList = list.map(({ node }) => ({
              id: node.id,
              title: node.title,
              splash: node.main_picture.large,
            }));
    
            socket.emit("message", "Zaaktualizowano liste.", "list", alcache[user.id].id);
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
            const formattedList: Anime[] = list.map(({ node }) => ({
              id: node.id,
              title: node.title,
              splash: node.main_picture.large,
            }));
    
            rooms[roomID].users[user.id].list = formattedList;
            alcache[user.id] = {id: listID, list: formattedList}
    
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
            if (rooms[roomID].currentTimeout !== null) {
              clearTimeout(rooms[roomID].currentTimeout);
              rooms[roomID].currentTimeout = null;
            }
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
}
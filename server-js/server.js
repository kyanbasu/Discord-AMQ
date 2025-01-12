import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

import { addQueue, playNextQueue } from "./scripts/queueManagment.js"
import * as chat from "./scripts/chat.js";
import { getAnimeList } from "./scripts/helpers.js";

dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;

import http from "http";
const server = http.createServer(app);
import { Server } from "socket.io";
const io = new Server(server, {
  cors: {
      origin: `discordsays.com`
  }
});



//clean cache
fs.readdir("../client/res/", (err, files) => {
  if (err) throw err;

  for (const file of files) {
    console.log("removing cached " + path.join("../client/res/", file))
    fs.unlink(path.join("../client/res/", file), (err) => {
      if (err) throw err;
    });
  }
});
// Allow express to parse JSON bodies
app.use(express.json());

const skipTime = 70; // skips x seconds after guess time is over

var rooms = {}
var sockets = {}
var users = {}

var alcache = {}

fs.readFile("./cache.json", (err, data) => {
  if(err) return console.error(err)
  alcache = JSON.parse(data)
})

export { rooms, io };

io.on('connection', socket => {
  //console.log("Client connected with id " + socket.id)

  socket.on('message', (roomID, message) => {
    if(message == undefined) return
    //console.log(message)

    if(message.includes("!play"))
      return addQueue(socket, roomID, message.split(" ").at(-1))

    return chat.sendChatMessage(roomID, `> ${new Date().toLocaleString('en-GB',{hour12: false}).slice(12,17)} <span style="color:salmon">${message}</span>`)
  })

  socket.on('join-room', async (roomID, user) => {
    socket.join(roomID);
    user.score = 0
    if(!rooms[roomID]){
      rooms[roomID] = {    // if song is playing / if is paused (could be playing but won't play next from queue) 
        users: {}, queue: [], queueHistory: [], playing: false, paused: true, canPlayNext: true, gameState: 'lobby', host: user.id, currentTimeout: null, chathistory: '', animeList : [],
        //    themeType ( OP, ED, ALL ), duration in seconds before playing next
        options: { themeType: "OP", guessTime: 10, queueSize: 10, guessType: 0, guessesCount: 4},
      }

      rooms[roomID].users[user.id] = user
      
      socket.emit('addAvatar', user, (user.id == rooms[roomID].host ? true : false))
      //console.log(rooms)
    } else {
      Object.values(rooms[roomID].users).forEach(_user => {
        socket.emit('addAvatar', _user, (_user.id == rooms[roomID].host ? true : false))
      });
      if(!rooms[roomID].users[user.id]){
        rooms[roomID].users[user.id] = user
        io.to(roomID).emit('addAvatar', user)
      }
      socket.emit('message', rooms[roomID].chathistory)
    }

    if(rooms[roomID].gameState == 'playing'){
      socket.emit('message', 'Dołączanie do trwającej gry...', 'playing')
    }

    if(alcache[user.id]){
      try{
        //let list = await getAnimeList(alcache[user.id])
        let list = alcache[user.id].list
        list.forEach(entry => {
          if(!rooms[roomID].animeList.some(e => e.id == entry.id)){
            rooms[roomID].animeList.push(entry)
          }
        });
        socket.emit('message', 'Zaaktualizowano liste.', 'list', alcache[user.id].userid)
        chat.userAnnouncement(socket, `Zaladowano liste. (${list.length}), ostatnia aktualizacja: ${alcache[user.id].lastUpdate}`)
      } catch {
        socket.emit('message', 'nie znaleziono takiego profilu MAL')
      }
    }
    socket.emit("optionsReload", rooms[roomID].options)
    sockets[socket.id] = user.id
    users[user.id] = {socket: socket, roomID: roomID}
    //console.log(socket)
  })

  socket.on('updateAL', async (roomID, user, listID) => {
    if(rooms[roomID].gameState == 'lobby'){
      console.log('update list')

      try{
        let list = await getAnimeList(listID)
        let formattedList = []
        list.forEach(entry => {
          formattedList.push({id: entry.node.id, title: entry.node.title, splash: entry.node.main_picture.medium})
        });
        rooms[roomID].users[user.id].list = formattedList
        alcache[user.id] = {"userid": listID, "lastUpdate": new Date().toISOString().split('T')[0], "list": formattedList,}
        fs.writeFileSync('./cache.json', JSON.stringify(alcache, null, 2) , 'utf-8');
        chat.userAnnouncement(socket, `Zaaktualizowano liste. (${formattedList.length})`)
      } catch {
        socket.emit('message', 'Nie znaleziono takiego profilu MAL')
        chat.userAnnouncement(socket, 'Nie znaleziono takiego profilu MAL')
      }

    } else {
      socket.emit('message', 'Nie można zaaktualizować listy podczas gry!')
    }
  })

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

  socket.on('disconnect', () => {
    console.log('user disconnected ' + socket.id);
    if(sockets[socket.id]){
      if(users[sockets[socket.id]].socket != socket.id) return delete sockets[socket.id]
      let roomID = users[sockets[socket.id].id].roomID
      io.to(roomID).emit('user-disconnected', sockets[socket.id])
      //console.log(`removing user at index ${rooms[sockets[socket.id].roomID].users.findIndex(user => user.id == sockets[socket.id].userID)}`)
      delete rooms[roomID].users[sockets[socket.id]]
      
      if(Object.keys(rooms[roomID].users).length == 0){
        console.log(`deleting room ${roomID} because there are no users`)
        delete rooms[roomID]
      }
      delete sockets[socket.id]
    }
  });
})

app.post("/api/token", async (req, res) => {
  
  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.body.code,
    }),
  }).catch(error => console.error(error));

  // Retrieve the access_token from the response
  const { access_token } = await response.json().catch(error => console.error(error));

  // Return the access_token to our client as { access_token: "..."}
  res.send({access_token});
});
/*
app.post('/anime', (req, res) => {
  fetch(`https://api.myanimelist.net/v2/users/${req.body.user}/animelist?limit=1000&status=watching&status=completed`, {
  headers: {
      'X-MAL-CLIENT-ID': 'f01f99efa89d0a650a365dd317ccc931'
  }
  })
  .then(response => response.json())
  .then(text => {
    res.json(text.data)
  })
})

app.post('/audio', async (req, res) => {
  res.json({audio: await getAudioUrl(req.body.mal_id).link})
})*/

app.get('/', (req,res) => {
  res.send("working.")
})

server.listen(port, () => {
  console.log(`Server and Socket.io listening at http://localhost:${port}`);
});
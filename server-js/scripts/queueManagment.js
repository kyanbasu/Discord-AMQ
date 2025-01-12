import { rooms, io } from '../server.js'
import { shuffleArray, getAudioUrl, downloadFile } from './helpers.js'
import { systemMessage } from './chat.js'

export const addQueue = (async (socket, roomID, malID) => {
    if(!rooms[roomID]) return socket.emit('message', 'Ten pokój nie istnieje')
    if(rooms[roomID].queue.includes(malID) || rooms[roomID].queueHistory.includes(malID)) return socket.emit('message', `${malID} jest już w kolejce`)
    rooms[roomID].queue.push(malID)
    socket.emit('message', `Dodano ${malID} do kolejki`)
  
    if(!rooms[roomID].paused && !rooms[roomID].playing){
      clearTimeout(rooms[roomID].currentTimeout)
      rooms[roomID].playing = false
      rooms[roomID].currentTimeout = null
  
      await playNextQueue(roomID);
    }
})
  
export const playNextQueue = (async (roomID) => {
    if(!rooms[roomID] || rooms[roomID].playing || rooms[roomID].currentTimeout != null) return //to probably remove duplicate processes

    if(Object.keys(rooms[roomID].users).length == 0){
        console.log(`deleting room ${roomID} because there are no users`)
        delete rooms[roomID]
        return
    }

    if(!rooms[roomID].paused){
        //summary after all songs
        if(rooms[roomID].queue.length == 0){
            let o = ""
            let sortedUsers = Object.values(rooms[roomID].users)
                .sort((a, b) => b.score - a.score)
                //.map(user => user) //not needed

            sortedUsers.forEach(u => {
                o += `${u.global_name} ${u.score}pkt<br/>`
            })

            rooms[roomID].gameState = 'lobby'
            rooms[roomID].paused = true
            rooms[roomID].canPlayNext = true
            return io.to(roomID).emit('message', `<span style="color: var(--maincontrast)">> Koniec.<br/>> Wyniki:<br/>${o}</span>`, 'end')
        }
        systemMessage(roomID, 'Bufferuje...')
        //io.to(roomID).emit('message', `LOG> pobieranie ${rooms[roomID].queue[0]}`)
        if(!rooms[roomID].playing) rooms[roomID].playing = true
        rooms[roomID].canPlayNext = false
        let audio = await getAudioUrl(rooms[roomID].queue[0], rooms[roomID].options.themeType).catch(error => console.error(error));
        if(!audio){
            io.to(roomID).emit('message', `LOG> nie znaleziono ${rooms[roomID].queue[0]}`)
            rooms[roomID].queueHistory.push(rooms[roomID].queue.shift())
            rooms[roomID].playing = false
            console.log(`history ${rooms[roomID].queueHistory.toString()}`)

            let newPick = rooms[roomID].animeList.filter(e => (!rooms[roomID].queue.includes(e.id) && !rooms[roomID].queueHistory.includes(e.id)))
            if(newPick.length == 0){
                console.log(`anime list is empty`)
                return await playNextQueue(roomID)
            }
            newPick = newPick[Math.floor(Math.random() * newPick.length)]
            console.log(`instead added ${newPick.id} ${newPick.title} to queue`)
            rooms[roomID].queue.push(newPick.id)

            return await playNextQueue(roomID)
        }
        //if(!audio) return io.to(roomID).emit('message', `Failed to find audio`)

        if(!rooms[roomID]) return

        console.log(audio)

        let guesses = []
        let tempList = rooms[roomID].animeList.filter(e => e.id != Number(audio.link.split('-')[0])) // to avoid duplicates in guesses
        //console.log(`removed from list ${rooms[roomID].animeList.filter(e => e.id == Number(audio.link.split('-')[0]))[0].title}`)
        for (let i = 0; i < Math.min(rooms[roomID].options.guessesCount, tempList.length)-1; i++) {
        let rng = Math.floor(Math.random() * tempList.length)
        guesses.push(tempList[rng].title)
        tempList.splice(rng, 1)
        }
        guesses.push(audio.name)
        shuffleArray(guesses)

        let imgUrl = rooms[roomID].animeList.filter(e => e.id == Number(audio.link.split('-')[0]))[0].splash
        await downloadFile(imgUrl, audio.link + ".jpg")

        let correctGuess = guesses.findIndex(e => e == audio.name)

        Object.values(rooms[roomID].users).forEach(u => {
            u.guess = undefined
        })
        io.to(roomID).emit('audio', audio.link, guesses)
        systemMessage(roomID, 'Gram...')
        //io.to(roomID).emit('message', `LOG> gram ${audio.name} ${audio.themeType}`)
        rooms[roomID].queue.shift()

        if(rooms[roomID].currentTimeout == null){
            rooms[roomID].currentTimeout = setTimeout(async () => {
                if(!rooms[roomID]) return

                io.to(roomID).emit('guess', `${audio.name} ${audio.themeType}`)
                rooms[roomID].canPlayNext = true

                let guessed = []
                Object.values(rooms[roomID].users).forEach(usr => {
                    if(correctGuess === usr.guess){
                        usr.score += 1
                        guessed.push(usr.global_name)
                    }
                })

                io.to(roomID).emit('correctlyGuessed', guessed.join(', '))
                systemMessage(roomID, `Pozostało ${rooms[roomID].queue.length} utworów w kolejce.`)

                rooms[roomID].currentTimeout = setTimeout(async () => {
                    if(!rooms[roomID]) return
                    rooms[roomID].playing = false
                    rooms[roomID].currentTimeout = null
                    return await playNextQueue(roomID)
                }, (90 - rooms[roomID].options.guessTime) * 1000);
                
            }, rooms[roomID].options.guessTime * 1000 + 1000);
        }

    } else {
        systemMessage(roomID, 'Zapauzowano.')
    }
})
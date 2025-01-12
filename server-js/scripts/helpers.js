import ffmpeg from 'fluent-ffmpeg'
import fetch from "node-fetch";
import fs from "node:fs";

/* Randomize array in-place using Durstenfeld shuffle algorithm */
export const shuffleArray = (array) => {
    for (var i = array.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export const downloadFile = (async (url, filename) => {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream("../client/res/" + filename);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
});

export const getAudioUrl = (malID, themeType = null) => {
    try{
      return new Promise((resolve, reject) => {
        fetch(`https://api.animethemes.moe/anime?filter[has]=resources&include=resources&filter[site]=MyAnimeList&filter[external_id]=${malID}&include=animethemes.animethemeentries.videos.audio`)
        .then(response => response.json())
        .then(obj => {
          if(obj.anime[0] == undefined) return reject()
            
          let _animes;
          if(themeType == "ALL")
            _animes = obj.anime[0].animethemes
          else
            _animes = obj.anime[0].animethemes.filter((e) => e.type == themeType);
          
          if(_animes.length == 0) return reject()
          let entry = _animes[Math.floor(_animes.length * Math.random())];
          let link = entry.animethemeentries[0].videos[0];
  
          if(fs.existsSync(`../client/res/${malID}-${entry.slug}.ogg`) && fs.existsSync(`../client/res/${malID}-${entry.slug}.webm`)){
            return resolve(`../client/res/${malID}-${entry.slug}`)
          }
  
          console.log(`> Downloading ${link.link} (${malID}-${entry.slug})`)
    
          ffmpeg()
          .input(link.link)
          //.outputOptions('-ss', '00:20')
          //.outputOptions('-to', '00:50')
          .outputOptions('-c', 'copy')
          //.outputOptions('-crf', '18')
          //.outputOptions('-preset', 'ultrafast')
          //.outputOptions('-vf', 'scale=640:480')
          //.outputOptions('-sws_flags', 'fast_bilinear')
          .saveToFile(`../client/res/${malID}-${entry.slug}.webm`)
          .on('end', () => {
            ffmpeg()
            .input(link.audio.link)
            //.outputOptions('-ss', '00:20')
            //.outputOptions('-to', '00:50')
            .outputOptions('-c', 'copy')
            //.outputOptions('-crf', '18')
            //.outputOptions('-preset', 'ultrafast')
            //.outputOptions('-vf', 'scale=640:480')
            //.outputOptions('-sws_flags', 'fast_bilinear')
            .saveToFile(`../client/res/${malID}-${entry.slug}.ogg`)
            .on('end', () => {
              console.log('FFmpeg has finished.');
              setTimeout(function() {
                if(fs.existsSync(`../client/res/${malID}-${entry.slug}.webm`))
                  fs.unlink(`../client/res/${malID}-${entry.slug}.webm`, (err) => {
                    if (err) throw err;
                    console.log(`${malID}-${entry.slug} was deleted`);
                  });
                  
                if(fs.existsSync(`../client/res/${malID}-${entry.slug}.ogg`))
                  fs.unlink(`../client/res/${malID}-${entry.slug}.ogg`, (err) => {
                    if (err) throw err;
                  });
                
                if(fs.existsSync(`../client/res/${malID}-${entry.slug}.jpg`))
                  fs.unlink(`../client/res/${malID}-${entry.slug}.jpg`, (err) => {
                    if (err) throw err;
                  });
              }, 60000);
              var o = {link: `${malID}-${entry.slug}`, name: obj.anime[0].name, themeType: entry.slug};
              return resolve(o);
            })
          })
          //.on('progress', function(progress) { console.log(progress.timemark + ' processed'); })
          .on('error', (error) => {
            console.error(error);
            return reject()
          });
    
        })
        .catch((e) => {
          return reject()
        })
      })
    } catch (error){
      console.error(error)
    }
}

//only works for MAL for now
export const getAnimeList = (async (ID) => {
    try{
      return new Promise((resolve, reject) => {
        fetch(`https://api.myanimelist.net/v2/users/${ID}/animelist?limit=1000&status=watching&status=completed`, {
          headers: {
              'X-MAL-CLIENT-ID': 'f01f99efa89d0a650a365dd317ccc931'
          }
          })
          .then(response => response.json())
          .then(text => {
            return resolve(text.data)
          })
          .catch(error => {
            console.error(error)
            return reject(error)
          })
        })
      } catch (error){
        console.error(error)
      }
})
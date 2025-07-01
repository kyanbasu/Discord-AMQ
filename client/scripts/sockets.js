let songCounter = 0;

import {
  updatePlayerList,
  displayMessage,
  displayAnnoucement,
  preloadMedia,
  setupOptionsGUI,
  setService,
} from "./helpers";

import {
  dscstatus,
  videoPlayer,
  player,
  discordSdk,
  selectedPlayerType,
} from "./main";

import * as Sentry from "@sentry/browser";

import { optionsReload } from "./optionsReload";

import { io } from "socket.io-client";

const socket = io(
  window.location.href.split("/").slice(0, 3).join("/").replace("https", "wss"),
  {
    reconnectionDelayMax: 10000,
  }
);

let options = {};

export function setupSocket() {
  socket.on("audio", async (url, guesses) => {
    try {
      console.log(guesses);
      for (let i = 0; i < guesses.length; i++) {
        document.getElementById(`guess${i}`).innerHTML = guesses[i];
        document.getElementById(`guess${i}`).classList.remove("guessButton");
      }
      document.getElementById("guessingZone").hidden = false;
      document.getElementById("options").hidden = true;
      songCounter += 1;

      dscstatus.activity.details = `In game ${songCounter} of ${options.queueSize}`;
      await discordSdk.commands.setActivity(dscstatus);

      player.hidden = true;
      videoPlayer.src = `media/${url}/${selectedPlayerType}`;
      videoPlayer.triggeredSkip = false;

      document.getElementById(
        "videoPlayerImgBg"
      ).style.backgroundImage = `url('media/${url}/jpg')`;

      console.log("background image")
      console.log(document.getElementById(
        "videoPlayerImgBg"
      ).backgroundImage)

      let _src = "";
      if (selectedPlayerType == "ogg") _src = `media/${url}/jpg`;

      document.getElementById("videoPlayerImg").src = _src;

      document.getElementById("Skip").hidden = true;
      videoPlayer.play();
    } catch (e) {
      Sentry.withScope((scope) => {
        scope.setTag("socket.on", "audio");
        Sentry.captureException(e);
      });
    }
  });

  socket.on("guess", (name) => {
    document.getElementById("themeTitle").innerText = name;
    player.hidden = false;
    document.getElementById("guessingZone").hidden = true;
    displayMessage(`That was ${name}`);
    setTimeout(() => {
      document.getElementById("Skip").hidden = false;
    }, 3000);
  });

  socket.on("correctlyGuessed", (e) => {
    displayMessage(
      `<span style="color: var(--maincontrast)"> Correctly guessed: ${e}</span>`
    );
  });

  socket.on("optionsReload", (_options) => {
    options = _options;
    setupOptionsGUI();
    optionsReload();
  });

  socket.on("updatePlayerList", (playerList, host) => {
    updatePlayerList(playerList, host);
  });

  socket.on("message", async (text, additionalInfo = null) => {
    displayMessage(text);
    switch (additionalInfo) {
      case "pause":
        document.getElementById("PlayPause").innerHTML = "Play";
        break;

      case "play":
        document.getElementById("PlayPause").innerHTML = "Pause";
        break;

      case "end":
        document.getElementById("PlayPause").innerHTML = "Play";
        videoPlayer.src = "";
        player.hidden = true;
        document.getElementById("guessingZone").hidden = true;
        document.getElementById("options").hidden = false;
        dscstatus.activity.details = "In the lobby";
        songCounter = 0;
        await discordSdk.commands.setActivity(dscstatus);
        break;

      case "playing": //when lobby is in game and playing
        document.getElementById("options").hidden = true;
        document.getElementById("player").hidden = false;
        document.getElementById("Skip").hidden = false;
        break;

      default:
        break;
    }
  });

  socket.on("data-list", (username, updated, service, count) => {
    document.getElementById("animelistname").value = username;
    document.getElementById("lastAnimeListUpdate").innerText = new Date(
      updated
    ).toLocaleString();
    setService(service, true, ` (${count} entries)`);
  });

  socket.on("cacheURL", (url) => {
    console.log(url);
    preloadMedia(url, selectedPlayerType);
  });

  socket.on("announce", (message, importanceLevel = 0) => {
    displayAnnoucement(message, importanceLevel);
  });

  socket.on("disconnect", (reason, details) => {
    Sentry.withScope((scope) => {
      console.log(details);
      scope.setExtra("details", details);
      Sentry.captureException(Error(`User disconnected, reason: ${reason}`));
    });

    displayMessage("disconnected... please restart app");
  });

  socket.on("reconnect_attempt", (attempt) => {
    displayMessage("reconnecting... " + attempt);
  });

  socket.on("reconnect", (attempt) => {
    displayMessage("reconnected " + attempt);
  });

  socket.on("connected");
}

export { socket, options };

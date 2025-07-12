let songCounter = 0;

import {
  updatePlayerList,
  displayMessage,
  displayAnnoucement,
  preloadMedia,
  setupOptionsGUI,
  setService,
  incrementLoading,
} from "./helpers";

import {
  dscstatus,
  videoPlayer,
  player,
  discordSdk,
  selectedPlayerType,
  auth,
} from "./main";

import * as Sentry from "@sentry/browser";

import { optionsReload } from "./optionsReload";

import { io } from "socket.io-client";

const socketURL = window.location.href
  .split("/")
  .slice(0, 3)
  .join("/")
  .replace("https", "wss");

const socketOptions = {
  path: "/.proxy/socket.io/",
  transports: ["websocket"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  forceNew: true,
};

let socket = io(socketURL, socketOptions);

let options = {};

export function setupSocket() {
  socket.on("audio", async (url, guesses) => {
    try {
      console.log(guesses);
      for (let i = 0; i < guesses.length; i++) {
        document.getElementById(`guess${i}`).innerHTML = guesses[i].ro;
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

  socket.on("guess", (title, themeType, usr) => {
    document.getElementById(
      "themeTitle"
    ).innerText = `${title.ro} ${themeType}`;
    player.hidden = false;
    document.getElementById("guessingZone").hidden = true;
    displayMessage(`That was ${title.ro} ${themeType} from ${usr}'s list`);
    setTimeout(() => {
      document.getElementById("Skip").hidden = false;
    }, 3000);
  });

  socket.on("correctlyGuessed", (e) => {
    displayMessage(
      `<span style="color: var(--maincontrast)"> Correctly guessed: ${e}</span>`
    );
  });

  socket.on("loadingUpdate", () => {
    incrementLoading("Done.");
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
        document.getElementById("options").hidden = true;
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

    displayMessage(`disconnected... reason: ${reason}`);
    console.log("reason: ", reason);
  });

  socket.io.on("connect_error", (err) => {
    console.error("Connection error:", err);
    Sentry.withScope((scope) => {
      console.log(err);
      scope.setExtra("error", err);
      Sentry.captureException(Error(`User connect_error: ${err}`));
    });
    setTimeout(() => socket.open(), 2000);
  });

  socket.io.on("reconnect_attempt", (num) => {
    console.log(`Reconnection attempt #${num}`);
    displayMessage(`Reconnecting...`);
  });

  socket.io.on("reconnect", () => {
    displayMessage("Connected");
    socket.emit(
      "client-resync",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      auth.user
    );
  });

  // Optional retry limit or fallback logic in reconnect_failed
  socket.io.on("reconnect_failed", () => {
    console.error("Reconnect unsuccessful, prompt for manual reload");
    displayMessage("Reconnect failed");
  });

  socket.io.on("connect", () => {
    displayMessage("Connected");
  });
}

export { socket, options };

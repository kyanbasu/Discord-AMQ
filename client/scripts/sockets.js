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

const runningLocally = import.meta.env.VITE_RUN_LOCAL === "true";

import { autocompleteList } from "./optionsReload";

import * as Sentry from "@sentry/browser";

import { optionsReload } from "./optionsReload";

import { io } from "socket.io-client";

const socketURL = window.location.href
  .split("/")
  .slice(0, 3)
  .join("/")
  .replace("https", "wss");

const socketOptions = {
  path: !runningLocally ? "/.proxy/socket.io/" : "/socket.io/",
  transports: ["polling", "websocket", "webtransport"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  forceNew: true,
};

let socket = io(socketURL, socketOptions);

let options = {};

const clientSettings = {
  themeLang: "ro",
  volume: 0,
};

const acceptableTitleLang = ["ro", "en", "ja"];
export function ThemeTitleLanguageChange(value) {
  if (!acceptableTitleLang.includes(value)) return;
  clientSettings.themeLang = value;
  updatedClientSettings();
}

let updateClientSettingsTimeout = null;
export function updatedClientSettings() {
  clientSettings.volume = Number(
    document.getElementById("volume-slider").value
  );
  if (updateClientSettingsTimeout) clearTimeout(updateClientSettingsTimeout);
  updateClientSettingsTimeout = setTimeout(() => {
    socket.emit("updateClientSettings", auth.user, clientSettings);
  }, 5_000);
}

export function setupSocket() {
  socket.on("audio", async (url, guesses = null) => {
    try {
      if (guesses) {
        console.log(guesses);
        for (let i = 0; i < guesses.length; i++) {
          document.getElementById(`guess${i}`).innerHTML =
            guesses[i][clientSettings.themeLang];
          document.getElementById(`guess${i}`).classList.remove("guessButton");
        }
      } else {
        const animeTextGuess = document.getElementById("animeTextGuess");
        if (animeTextGuess) animeTextGuess.value = "";
      }
      document.getElementById("guessingZone").hidden = false;
      //document.getElementById("options").hidden = true;
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
      console.error(e);
    }
  });

  socket.on("correctGuess", (title, themeType, usr) => {
    document.getElementById("themeTitle").innerText = `${
      title[clientSettings.themeLang]
    } ${themeType}`;
    player.hidden = false;
    document.getElementById("guessingZone").hidden = true;
    displayMessage(
      `That was ${
        title[clientSettings.themeLang]
      } ${themeType} from ${usr}'s list`
    );
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

  socket.on("optionsReload", (_options, hostID) => {
    options = _options;
    setupOptionsGUI();
    optionsReload(hostID);
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

  socket.on("clientSettingsReload", (_clientSettings) => {
    document.getElementById("volume-slider").value = _clientSettings.volume;
    document.getElementById("volume-slider").dispatchEvent(new Event("input"));
    const radios = document.getElementsByName("themeTitleLanguage");
    for (let radio of radios) {
      if (radio.value === _clientSettings.themeLang) {
        radio.checked = true;
        // Optional: trigger change event if needed
        const changeEvent = new Event("change", { bubbles: true });
        radio.dispatchEvent(changeEvent);
        break;
      }
    }
  });

  socket.on("autocompleteResults", (results) => {
    if (results.length === 0) return;
    console.log(results);

    autocompleteList.innerHTML = "";
    results.forEach((result) => {
      console.log(result);
      const div = document.createElement("div");
      div.innerHTML = `<strong>${
        result.title[clientSettings.themeLang]
      }</strong>`;
      div.addEventListener("click", () => {
        document.getElementById("animeTextGuess").value =
          result.title[clientSettings.themeLang];
        console.log(result.id);
        socket.emit("guess", auth.user, result.id);
        autocompleteList.innerHTML = "";
      });
      autocompleteList.appendChild(div);
    });
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

    if (reason !== "ping timeout") {
      setTimeout(() => {
        socket.open();
        resync();
      }, 500);
    }
  });

  socket.on("connect_error", (err) => {
    console.error("Connection error:", err);
    Sentry.withScope((scope) => {
      console.log(err);
      scope.setExtra("error", err);
      Sentry.captureException(Error(`User connect_error: ${err}`));
    });
    setTimeout(() => {
      socket.open();
      resync();
    }, 500);
  });

  socket.io.on("reconnect_attempt", (num) => {
    console.log(`Reconnection attempt #${num}`);
    displayMessage(`Reconnecting...`);
  });

  socket.io.on("reconnect", () => {
    displayMessage("Connected");
    resync();
  });

  // Optional retry limit or fallback logic in reconnect_failed
  socket.io.on("reconnect_failed", () => {
    console.error("Reconnect unsuccessful, prompt for manual reload");
    displayMessage("Reconnect failed");
  });

  socket.on("connect", () => {
    displayMessage("Connected");

    socket.io.engine.on("upgrade", (transport) => {
      console.log(`transport upgraded to ${transport.name}`);
    });
  });
}

function resync() {
  socket.emit(
    "client-resync",
    `${discordSdk.guildId}/${discordSdk.channelId}`,
    auth.user
  );
}

export { socket, options };

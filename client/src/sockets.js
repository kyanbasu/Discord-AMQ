import {
  incrementLoading,
  preloadMedia,
  setService,
  setupOptionsGUI,
} from "./helpers/helpers";

import { auth } from "./discordSetup";
import { updatePlayerList } from "./helpers/updatePlayerList";
import { runningLocally } from "./main";
import { selectedPlayerType } from "./windowEventListeners";

import { optionsReload } from "./optionsReload";

import { io } from "socket.io-client";
import { handleOnAudio } from "./socketHandlers/audio";
import { handleConnection } from "./socketHandlers/connection";
import { handleGuessing } from "./socketHandlers/guessing";
import { handleMessaging } from "./socketHandlers/messaging";

export { clientSettings, options, socket };

const socketURL = window.location.href
  .split("/")
  .slice(0, 3)
  .join("/")
  .replace("https", "wss");

const socketOptions = {
  path: "/socket.io/",
  transports: ["polling", "websocket", "webtransport"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
  forceNew: true,
  auth: { token: "", user: {} },
};

var socket;

var options = {};

const clientSettings = {
  themeLang: "ro",
  volume: 0,
};

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

export function setupSocket(socketAuth) {
  if (runningLocally) socketOptions.auth.user = socketAuth;
  else socketOptions.auth.token = socketAuth;

  socket = io(socketURL, socketOptions);

  handleOnAudio(socket);

  handleConnection(socket);

  handleGuessing(socket);

  handleMessaging(socket);

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

  socket.on("cacheURL", (url) => {
    console.log(url);
    preloadMedia(url, selectedPlayerType);
  });
}

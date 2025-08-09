import { io } from "socket.io-client";
import { auth } from "./discordSetup";
import { runningLocally } from "./main";

import { handleOnAudio } from "./socketHandlers/audioHandler";
import { handleConnection } from "./socketHandlers/connectionHandler";
import { handleData } from "./socketHandlers/dataHandler";
import { handleGuessing } from "./socketHandlers/guessHandler";
import { handleMessaging } from "./socketHandlers/messageHandler";

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

const options = {};

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

  handleData(socket);
}

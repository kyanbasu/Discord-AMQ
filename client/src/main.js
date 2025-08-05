import { RPCCloseCodes } from "@discord/embedded-app-sdk";

const runningLocally = import.meta.env.VITE_RUN_LOCAL === "true";

//closes app on vite reload, because thing would be broken that way
import.meta.hot.on("vite:beforeFullReload", async () => {
  await discordSdk.close(RPCCloseCodes.CLOSE_NORMAL, "You exited from app");
});

import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tunnel: "/sentry-tunnel",
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "unknown",
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: [
    "localhost",
    "discordsays.com",
    /^\//,
    /^https:\/\/discord.com\//,
    /^https:\/\/cdn.discordapp.com\//,
  ],
  _experiments: { enableLogs: true },
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

import { connectDiscord, connectFakeDiscord, discordSdk } from "./discordSetup";

import { socket, options, updatedClientSettings } from "./sockets";

import "../css/style.css";
import { Skip } from "./windowFunctions";

export { videoPlayer, player, runningLocally };

document.getElementById("Skip").hidden = true;
document.getElementById("guessingZone").hidden = true;

document.getElementById("playerTypeSwitch").dispatchEvent(new Event("change"));

let videoPlayer = document.getElementById("videoPlayer");
let player = document.getElementById("player");

if (runningLocally) {
  connectFakeDiscord();
} else {
  await connectDiscord();
}

player.hidden = true;

// if (window.innerHeight < window.innerWidth) player.style.top = "100px";
// else player.style.left = "20px";

videoPlayer.volume = 0.1;
document.getElementById("volume-slider").value = videoPlayer.volume;
document.getElementById("volume-slider").style.background =
  "linear-gradient(0deg, rgb(80,0,20), rgb(80,0,20) " +
  Math.floor(document.getElementById("volume-slider").value * 100 - 1) +
  "%, #363232 " +
  Math.floor(document.getElementById("volume-slider").value * 100) +
  "%, #363232)";

document.getElementById("volume-slider").oninput = () => {
  let value = document.getElementById("volume-slider").value;
  videoPlayer.volume = value;
  updatedClientSettings();
  document.getElementById("volume-slider").style.background =
    "linear-gradient(0deg, rgb(80,0,20), rgb(80,0,20) " +
    Math.floor(value * 100 - 1) +
    "%, #363232 " +
    Math.floor(value * 100) +
    "%, #363232)";
};

videoPlayer.ontimeupdate = () => {
  if (videoPlayer.currentTime < options.guessTime)
    document.getElementById("progress").style.width = `${
      (videoPlayer.currentTime / options.guessTime) * 100
    }%`;
  else
    document.getElementById("progress").style.width = `${
      (videoPlayer.currentTime / videoPlayer.duration) * 100
    }%`;

  if (
    videoPlayer.duration - videoPlayer.currentTime < 5 &&
    !videoPlayer.triggeredSkip
  ) {
    videoPlayer.triggeredSkip = true;
    Skip();
  }
};

videoPlayer.onended = () => {
  player.hidden = true;
};

let UpdateTextGuessAutocompleteTimeout = null;

export function UpdateTextGuessAutocomplete() {
  if (UpdateTextGuessAutocompleteTimeout) return;
  UpdateTextGuessAutocompleteTimeout = setTimeout(() => {
    UpdateTextGuessAutocompleteTimeout = null;
    if (document.getElementById("animeTextGuess").value.length < 2)
      return (document.getElementById("autocomplete-list").innerHTML = "");
    socket.emit(
      "autocomplete",
      document.getElementById("animeTextGuess").value
    );
  }, 300);
}

document.onvisibilitychange = (event) => {
  //user exited app
  if (document.visibilityState == "hidden") appExit();
};

function appExit() {
  socket.disconnect();
}

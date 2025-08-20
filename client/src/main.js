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

import {
  connectDiscord,
  connectFakeDiscord,
  discordSdk,
} from "./discordSetup.js";

import { options, socket, updatedClientSettings } from "./socketCore.js";

import "../css/style.css";
import {
  guessingZoneEl,
  playerContainerEl,
  playerTypeSwitchEl,
  skipButtonEl,
  videoPlayerEl,
  volumeSliderEl,
} from "./appElements.js";
import { animeTextGuess, autocompleteList } from "./optionsReload.js";
import { Skip } from "./windowFunctions.js";

export { runningLocally };

skipButtonEl.hidden = true;
guessingZoneEl.hidden = true;

playerTypeSwitchEl.dispatchEvent(new Event("change"));

if (runningLocally) {
  connectFakeDiscord();
} else {
  connectDiscord();
}

playerContainerEl.hidden = true;

// if (window.innerHeight < window.innerWidth) player.style.top = "100px";
// else player.style.left = "20px";

videoPlayerEl.volume = 0.1;
volumeSliderEl.value = videoPlayerEl.volume.toString();
volumeSliderEl.style.background =
  "linear-gradient(0deg, rgb(80,0,20), rgb(80,0,20) " +
  Math.floor(Number(volumeSliderEl.value) * 100 - 1) +
  "%, #363232 " +
  Math.floor(Number(volumeSliderEl.value) * 100) +
  "%, #363232)";

volumeSliderEl.oninput = () => {
  let value = volumeSliderEl.value;
  videoPlayerEl.volume = Number(value);
  updatedClientSettings();
  volumeSliderEl.style.background =
    "linear-gradient(0deg, rgb(80,0,20), rgb(80,0,20) " +
    Math.floor(Number(value) * 100 - 1) +
    "%, #363232 " +
    Math.floor(Number(value) * 100) +
    "%, #363232)";
};

const progress = document.getElementById("progress");

progress.style.transitionDuration = "0s";
progress.style.width = "0%";

videoPlayerEl.ontimeupdate = () => {
  if (
    videoPlayerEl.duration - videoPlayerEl.currentTime < 5 &&
    !videoPlayerEl.triggeredSkip
  ) {
    videoPlayerEl.triggeredSkip = true;
    Skip();
  }
};

export function startGuessProgressBar() {
  progress.style.transitionDuration = "0s";
  progress.style.width = "0%";

  // Force reflow to ensure the width reset is applied before transition
  void progress.offsetWidth;

  progress.style.transitionDuration = `${options.guessTime}s`;
  progress.style.width = "100%";
}

export function continueProgressBarAfterGuess() {
  progress.style.transitionDuration = "0s";
  progress.style.width = `${
    (options.guessTime / videoPlayerEl.duration) * 100
  }%`;

  // Force reflow to ensure the width reset is applied before transition
  void progress.offsetWidth;

  progress.style.transitionDuration = `${
    videoPlayerEl.duration - options.guessTime
  }s`;
  progress.style.width = "100%";
}

videoPlayerEl.onended = () => {
  playerContainerEl.hidden = true;
};

let UpdateTextGuessAutocompleteTimeout = null;

export function UpdateTextGuessAutocomplete() {
  if (UpdateTextGuessAutocompleteTimeout) return;
  UpdateTextGuessAutocompleteTimeout = setTimeout(() => {
    UpdateTextGuessAutocompleteTimeout = null;

    if (animeTextGuess.value.length < 2)
      return (autocompleteList.innerHTML = "");
    socket.emit("autocomplete", animeTextGuess.value);
  }, 300);
}

document.onvisibilitychange = (event) => {
  //user exited app
  if (document.visibilityState == "hidden") appExit();
};

function appExit() {
  socket.disconnect();
}

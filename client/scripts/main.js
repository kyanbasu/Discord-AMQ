import {
  DiscordSDK,
  patchUrlMappings,
  RPCCloseCodes,
} from "@discord/embedded-app-sdk";

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

import { setupDiscordSdk } from "./discordSetup";
import {
  appendVoiceChannelName,
  displayAnnoucement,
  getService,
  incrementLoading,
} from "./helpers";

import { setupSocket, socket, options, updatedClientSettings } from "./sockets";

import "../css/style.css";

// Will eventually store the authenticated user's access_token
var auth;
var discordSdk;

let dscstatus = {
  activity: {
    type: 0,
    details: "In the lobby",
    assets: {
      large_text: "change this in prod",
      small_image: "map-mainframe",
      small_text: "in Mainframe",
    },
    timestamps: {
      start: Math.floor(Date.now() / 1000),
    },
  },
};

document.getElementById("Skip").hidden = true;
document.getElementById("guessingZone").hidden = true;

let selectedPlayerType = "ogg";

document.getElementById("playerTypeSwitch").addEventListener("change", () => {
  if (options.novideo && document.getElementById("playerTypeSwitch").checked) {
    document.getElementById("playerTypeSwitch").checked = 0;
    displayAnnoucement(
      "Video is disabled on the server, using audio only mode",
      1
    );
    selectedPlayerType = "ogg";
    return;
  }
  if (document.getElementById("playerTypeSwitch").checked)
    selectedPlayerType = "webm";
  else selectedPlayerType = "ogg";
});

document.getElementById("playerTypeSwitch").dispatchEvent(new Event("change"));

document.getElementById("chatbtn").onclick = () => {
  sendMessage();
};

document.getElementById("chatin").onkeyup = (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
};

function sendMessage() {
  const text = document.getElementById("chatin").value;
  if (text.length > 0 && auth)
    socket.emit(
      "message",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      `${auth.user.global_name}: ${text}`
    );
  document.getElementById("chatin").value = "";
}

let videoPlayer = document.getElementById("videoPlayer");
let player = document.getElementById("player");

if (!runningLocally) {
  discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

  incrementLoading("Connecting to Discord");

  //removeFadeOut(document.getElementById('loading'), 500) //remove this in prod
  setupDiscordSdk(discordSdk).then(async (_auth) => {
    auth = _auth;
    console.log("Discord SDK is authenticated");
    incrementLoading("Connecting to server");

    setupSocket();

    //discordSdk configs
    await discordSdk.commands.setActivity(dscstatus);
    /*
  await discordSdk.commands.setConfig({
    use_interactive_pip: true
  })*/

    socket.emit("discord-auth", auth.user);

    Sentry.setUser({
      id: auth.user.id,
      username: auth.user.global_name || auth.user.username,
    });
    Sentry.setTag("guildId", discordSdk.guildId);
    Sentry.setTag("channelId", discordSdk.channelId);

    Sentry.setUser({
      id: auth.user.id,
      username: auth.user.global_name || auth.user.username,
    });
    Sentry.setTag("guildId", discordSdk.guildId);
    Sentry.setTag("channelId", discordSdk.channelId);

    appendVoiceChannelName(discordSdk, socket, auth.user);

    const handleLayoutModeUpdate = (update) => {
      if (update.layout_mode <= 0) {
        // UNHANDLED or FOCUSED
        player.classList.remove("playerPIP");
      } else {
        // PIP, GRID
        player.classList.add("playerPIP");
      }
    };

    discordSdk.subscribe("ACTIVITY_LAYOUT_MODE_UPDATE", handleLayoutModeUpdate);
  });
} else {
  incrementLoading("Skipping discord connection.");

  discordSdk = {
    guildId: 1,
    channelId: 1,
    commands: {
      getChannel: (...a) => {
        return { name: "test" };
      },
      setActivity: (...a) => {},
    },
  };

  auth = {
    user: {
      username: "testuser",
      discriminator: "0",
      id: "1",
      avatar: "",
      global_name: "test",
    },
  };

  incrementLoading("Connecting to server");

  setupSocket();

  socket.emit("discord-auth", auth.user);

  appendVoiceChannelName(discordSdk, socket, auth.user);
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

// let animes = [];

export function PlayPause() {
  socket.emit("playPause", `${discordSdk.guildId}/${discordSdk.channelId}`);
}

export function Skip() {
  socket.emit("skip", `${discordSdk.guildId}/${discordSdk.channelId}`);
}

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

let canUpdateAL = true;

export function UpdateAnimeList() {
  if (!canUpdateAL) {
    displayAnnoucement(
      "You can only update your anime list every 30 seconds",
      1
    );
    return;
  }
  socket.emit(
    "updateAL",
    `${discordSdk.guildId}/${discordSdk.channelId}`,
    auth.user,
    document.getElementById("animelistname").value,
    getService()
  );
  canUpdateAL = false;
  setTimeout(() => {
    canUpdateAL = true;
  }, 30_000);
}

document.onvisibilitychange = (event) => {
  //user exited app
  if (document.visibilityState == "hidden") appExit();
};

function appExit() {
  socket.disconnect();
}

export {
  auth,
  dscstatus,
  videoPlayer,
  player,
  discordSdk,
  selectedPlayerType,
  runningLocally,
};
import {
  DiscordSDK,
  patchUrlMappings,
  RPCCloseCodes,
} from "@discord/embedded-app-sdk";

patchUrlMappings([{ prefix: ".proxy/", target: "discordsays.com/.proxy/" }]);

//closes app on vite reload, because thing would be broken that way
import.meta.hot.on("vite:beforeFullReload", async () => {
  await discordSdk.close(RPCCloseCodes.CLOSE_NORMAL, "You exited from app");
});

import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://173cb840a7c57f1d3d8054ae4f74fe02@o4509576208252928.ingest.de.sentry.io/4509576221818960",
  tunnel: "/.proxy/sentry-tunnel",
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
  removeFadeOut,
  displayAnnoucement,
  getService,
} from "./helpers";

import { setupSocket, socket, options } from "./sockets";

//import rocketLogo from '/rocket.png';
import "../css/style.css";

// Will eventually store the authenticated user's access_token
let auth;

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

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

//removeFadeOut(document.getElementById('loading'), 500) //remove this in prod
setupDiscordSdk(discordSdk).then(async (_auth) => {
  auth = _auth;
  console.log("Discord SDK is authenticated");
  setTimeout(() => {
    removeFadeOut(document.getElementById("loading"), 500);
  }, 1000);

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

//can remove
async function appendGuildAvatar() {
  const app = document.querySelector("#app");

  // 1. From the HTTP API fetch a list of all of the user's guilds
  const guilds = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
    headers: {
      // NOTE: we're using the access_token provided by the "authenticate" command
      Authorization: `Bearer ${auth.access_token}`,
      "Content-Type": "application/json",
    },
  }).then((response) => response.json());

  // 2. Find the current guild's info, including it's "icon"
  const currentGuild = guilds.find((g) => g.id === discordSdk.guildId);

  // 3. Append to the UI an img tag with the related information
  if (currentGuild != null) {
    const guildImg = document.createElement("img");
    guildImg.setAttribute(
      "src",
      // More info on image formatting here: https://discord.com/developers/docs/reference#image-formatting
      `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.webp?size=128`
    );
    guildImg.setAttribute("width", "128px");
    guildImg.setAttribute("height", "128px");
    guildImg.setAttribute("style", "border-radius: 50%;");
    app.appendChild(guildImg);
  }
}

// let animes = [];

export function PlayPause() {
  socket.emit("playPause", `${discordSdk.guildId}/${discordSdk.channelId}`);
}

export function Skip() {
  socket.emit("skip", `${discordSdk.guildId}/${discordSdk.channelId}`);
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

export { auth, dscstatus, videoPlayer, player, discordSdk, selectedPlayerType };

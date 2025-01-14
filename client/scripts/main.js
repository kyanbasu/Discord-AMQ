import {
  DiscordSDK,
  patchUrlMappings,
  RPCCloseCodes,
} from "@discord/embedded-app-sdk";

patchUrlMappings([{ prefix: ".proxy/", target: "discordsays.com/" }]);

//import rocketLogo from '/rocket.png';
import "../css/style.css";
import { io } from "socket.io-client";

// Will eventually store the authenticated user's access_token
let auth;

let options;

let dscstatus = {
  activity: {
    type: 0,
    details: "W lobby",
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

const socket = io(
  window.location.href.split("/").slice(0, 3).join("/").replace("https", "wss"),
  {
    reconnectionDelayMax: 10000,
  }
);

document.getElementById("Skip").hidden = true;
document.getElementById("guessingZone").hidden = true;

let selectedPlayerType = "ogg";
let songCounter = 0;

document.getElementById("playerTypeSwitch").addEventListener("change", () => {
  if (document.getElementById("playerTypeSwitch").checked)
    selectedPlayerType = "webm";
  else selectedPlayerType = "ogg";
});

document.getElementById("playerTypeSwitch").dispatchEvent(new Event("change"));

socket.on("audio", async (url, guesses) => {
  console.log(guesses);
  for (let i = 0; i < guesses.length; i++) {
    document.getElementById("guess" + i).innerHTML = guesses[i];
    document.getElementById(`guess${i}`).classList.remove("guessButton");
  }
  document.getElementById("guessingZone").hidden = false;
  document.getElementById("options").hidden = true;
  songCounter += 1;

  dscstatus.activity.details = `W grze ${songCounter} z ${options.queueSize}`;
  await discordSdk.commands.setActivity(dscstatus);

  player.hidden = true;
  videoPlayer.src = `res/${url}.${selectedPlayerType}`;
  videoPlayer.triggeredSkip = false;

  if (selectedPlayerType == "ogg")
    document.getElementById("videoPlayerImg").src = `res/${url}.jpg`;
  else document.getElementById("videoPlayerImg").src = "";
  document.getElementById("Skip").hidden = true;
  videoPlayer.play();
});

socket.on("guess", (name) => {
  player.hidden = false;
  document.getElementById("guessingZone").hidden = true;
  displayMessage(`To było ${name}`);
  setTimeout(() => {
    document.getElementById("Skip").hidden = false;
  }, 3000);
});

socket.on("correctlyGuessed", (e) => {
  displayMessage(
    `<span style="color: var(--maincontrast)">Poprawnie zgadli: ${e}</span>`
  );
});

socket.on("optionsReload", (_options) => {
  options = _options;
  setupOptionsGUI();
  optionsReload(options);
});

socket.on("addAvatar", (user, isHost) => {
  appendUserAvatar(user, isHost);
});

socket.on("message", async (text, additionalInfo = null, data = null) => {
  displayMessage(text);
  switch (additionalInfo) {
    case "pause":
      document.getElementById("PlayPause").innerHTML = "Graj";
      break;

    case "play":
      document.getElementById("PlayPause").innerHTML = "Pauza";
      break;

    case "end":
      document.getElementById("PlayPause").innerHTML = "Graj";
      videoPlayer.src = "";
      player.hidden = true;
      document.getElementById("guessingZone").hidden = true;
      document.getElementById("options").hidden = false;
      dscstatus.activity.details = "W lobby";
      songCounter = 0;
      await discordSdk.commands.setActivity(dscstatus);
      break;

    case "list":
      document.getElementById("animelistname").value = data;
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

socket.on("announce", (message, importanceLevel = 0) => {
  displayAnnoucement(message, importanceLevel);
});

socket.on("disconnect", () => {
  displayMessage("disconnected... please restart app");
});

socket.on("reconnect_attempt", (attempt) => {
  displayMessage("reconnecting... " + attempt);
});

socket.on("reconnect", (attempt) => {
  displayMessage("reconnected " + attempt);
});

socket.on("connected");

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

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

//closes app on vite reload, because thing would be broken that way
import.meta.hot.on("vite:beforeFullReload", async () => {
  await discordSdk.close(RPCCloseCodes.CLOSE_NORMAL, "You exited from app");
});

import { setupDiscordSdk } from "./discordSetup";
import {
  appendUserAvatar,
  appendVoiceChannelName,
  removeFadeOut,
  displayMessage,
  displayAnnoucement,
} from "./helpers";

//removeFadeOut(document.getElementById('loading'), 500) //remove this in prod
setupDiscordSdk(discordSdk).then(async (_auth) => {
  auth = _auth;
  console.log("Discord SDK is authenticated");
  removeFadeOut(document.getElementById("loading"), 500);

  //discordSdk configs
  await discordSdk.commands.setActivity(dscstatus);
  /*
  await discordSdk.commands.setConfig({
    use_interactive_pip: true
  })*/

  socket.emit("discord-auth", auth.user);

  appendVoiceChannelName(discordSdk, socket, auth.user);
});

let videoPlayer = document.getElementById("video-player");
let player = document.getElementById("player");

player.hidden = true;

if (window.innerHeight < window.innerWidth) player.style.top = "100px";
else player.style.left = "20px";

videoPlayer.volume = 0.1;
document.getElementById("volume-slider").value = videoPlayer.volume;
document.getElementById("volume-slider").style.background =
  "linear-gradient(0deg, rgb(80,0,20), rgb(80,0,20) " +
  Math.floor(document.getElementById("volume-slider").value * 100 - 1) +
  "%, #363232 " +
  Math.floor(document.getElementById("volume-slider").value * 100) +
  "%, #363232)";

document.getElementById("volume-slider").oninput = () => {
  var value = document.getElementById("volume-slider").value;
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

/*
Options are:
 .guessesCount
   amount of guess buttons, min 1, only applied when guessType is 0
 .guessType
   0 - picker, gives some answers to pick from
   1 - input, need to write entire name (with help of autocomplete)
*/
function optionsReload(options) {
  document.getElementById("guessingZone").innerHTML = ""; // clears guessing zone

  //currently only works with picker
  switch (options.guessType) {
    case 0: //picker
      for (let i = 0; i < options.guessesCount; i++) {
        const el = document.createElement("button");
        el.id = `guess${i}`;
        el.addEventListener("click", Guess);
        el.index = i;
        document.getElementById("guessingZone").append(el);
      }
      break;

    default:
      break;
  }

  document.getElementById("themeTypebtn").innerHTML = options.themeType;
  document.getElementById("queueSize").value = options.queueSize;
  document.getElementById("guessTime").value = options.guessTime;
  document.getElementById("guessesCount").value = options.guessesCount;
}

let pendingALUpdate = null;

document.getElementById("animelistname").addEventListener("change", () => {
  clearTimeout(pendingALUpdate);
  pendingALUpdate = setTimeout(() => {
    socket.emit(
      "updateAL",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      auth.user,
      document.getElementById("animelistname").value
    );
  }, 3000);
});

let pendingOptionsUpdate = null;

function updateOptions(options) {
  clearTimeout(pendingOptionsUpdate);
  pendingOptionsUpdate = setTimeout(() => {
    socket.emit(
      "updateOptions",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      auth.user,
      options
    );
  }, 1000);
}

var didOptionsSetup = false;
function setupOptionsGUI() {
  if (didOptionsSetup) return;
  document.getElementById("themeType").innerHTML = "";

  let btnOP = document.createElement("button");
  btnOP.innerHTML = "OP";
  btnOP.addEventListener("click", () => setThemeType("OP"));
  document.getElementById("themeType").append(btnOP);

  let btnED = document.createElement("button");
  btnED.innerHTML = "ED";
  btnED.addEventListener("click", () => setThemeType("ED"));
  document.getElementById("themeType").append(btnED);

  let btnALL = document.createElement("button");
  btnALL.innerHTML = "ALL";
  btnALL.addEventListener("click", () => setThemeType("ALL"));
  document.getElementById("themeType").append(btnALL);

  let queueSizeInput = document.getElementById("queueSize");
  queueSizeInput.addEventListener("change", () => {
    queueSizeInput.value = Math.min(
      queueSizeInput.max,
      Math.max(queueSizeInput.min, queueSizeInput.value)
    );
    options.queueSize = queueSizeInput.value;
    updateOptions(options);
  });

  let guessTimeInput = document.getElementById("guessTime");
  guessTimeInput.addEventListener("change", () => {
    guessTimeInput.value = Math.min(
      guessTimeInput.max,
      Math.max(guessTimeInput.min, guessTimeInput.value)
    );
    options.guessTime = guessTimeInput.value;
    updateOptions(options);
  });

  let guessesCount = document.getElementById("guessesCount");
  guessesCount.addEventListener("change", () => {
    guessesCount.value = Math.min(
      guessesCount.max,
      Math.max(guessesCount.min, guessesCount.value)
    );
    options.guessesCount = guessesCount.value;
    updateOptions(options);
  });

  didOptionsSetup = true;
}

function setThemeType(type) {
  options.themeType = type;
  updateOptions(options);
}

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

let animes = [];

export function PlayPause() {
  socket.emit("playPause", `${discordSdk.guildId}/${discordSdk.channelId}`);
}

function Guess(evt) {
  socket.emit(
    "guess",
    auth.user,
    `${discordSdk.guildId}/${discordSdk.channelId}`,
    evt.currentTarget.index
  );
  for (let i = 0; i < options.guessesCount; i++) {
    document.getElementById(`guess${i}`).classList.remove("guessButton");
  }
  document
    .getElementById(`guess${evt.currentTarget.index}`)
    .classList.add("guessButton");
}

export function Skip() {
  socket.emit("skip", `${discordSdk.guildId}/${discordSdk.channelId}`);
}

document.onvisibilitychange = (event) => {
  //user exited app
  if (document.visibilityState == "hidden") appExit();
};

function appExit() {
  socket.disconnect();
}

function toMMSS(seconds) {
  return new Date(seconds * 1000).toISOString().substring(14, 19) || 0;
}

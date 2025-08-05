import crownSrc from "/static/crown.svg";

import { auth, runningLocally } from "./main";
import { options } from "./sockets";
import { updateOptions, setThemeType, setGuessMode } from "./optionsReload";

const isMobile = () => {
  return navigator.userAgentData && navigator.userAgentData.mobile;
};

let players = {};
let ALservice = 0; // Default to MyAnimeList = 0, 1 = AniList
const ALservices = ["MyAnimeList", "AniList"];

export async function updatePlayerList(playerList, hostID) {
  const playerListElement = document.getElementById("playerList");
  playerListElement.innerHTML = ""; // Clear existing list

  const playerLabelList = document.getElementById("includedPlayerLists");
  playerLabelList.innerHTML = ""; // Clear existing list

  players = playerList;

  players.forEach((player) => {
    // Update player list on navbar, with avatars and crown for host
    (() => {
      let avatarSrc = "";
      if (player.avatar) {
        avatarSrc = `https://cdn.discordapp.com/avatars/${player.id}/${player.avatar}.png?size=256`;
      } else {
        const defaultAvatarIndex = Math.abs(Number(player.id) >> 22) % 6;
        avatarSrc = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
      }
      const container = document.createElement("div");
      container.setAttribute(
        "style",
        "display:flex;align-items:center;max-width:100px"
      );

      if (runningLocally) avatarSrc = "/undefined.jpg";

      const avatarImg = document.createElement("img");
      avatarImg.setAttribute("src", avatarSrc);
      avatarImg.setAttribute("height", "80%");
      avatarImg.setAttribute("style", "border-radius: 50%;");

      container.appendChild(avatarImg);

      if (player.id === hostID) {
        const crownImg = document.createElement("img");
        crownImg.setAttribute("src", crownSrc);
        crownImg.className = "crown";
        container.appendChild(crownImg);
      }

      playerListElement.appendChild(container);
    })();

    // Update player list on game settings
    (() => {
      const playerLabel = document.createElement("label");
      playerLabel.textContent = player.name;
      playerLabel.id = `player-${player.id}`;

      // Create the switch label
      const switchLabel = document.createElement("label");
      switchLabel.className = "switch";
      switchLabel.setAttribute("style", "transform: translate(4px, -4px);");

      // Create the checkbox input
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = true;
      checkbox.id = `checkbox-${player.id}`;
      checkbox.setAttribute("player-id", player.id);

      // Create the slider span
      const slider = document.createElement("span");
      slider.className = "slider";

      // Append checkbox and slider to the switch label
      switchLabel.appendChild(checkbox);
      switchLabel.appendChild(slider);

      // Create entries label
      const entriesLabel = document.createElement("label");
      entriesLabel.textContent = `(${
        options.playerList && options.playerList.hasOwnProperty(player.id)
          ? options.playerList[player.id].entries
          : "?"
      } entries)`;
      entriesLabel.setAttribute("style", "margin-left: 8px;");
      entriesLabel.id = `player-entries-${player.id}`;

      // Append all elements to the list line
      playerLabelList.appendChild(playerLabel);
      playerLabelList.appendChild(switchLabel);
      playerLabelList.appendChild(entriesLabel);
      playerLabelList.appendChild(document.createElement("br"));

      if (auth.user.id === hostID) {
        checkbox.addEventListener("change", setPlayerIncluded);
      } else {
        checkbox.setAttribute("disabled", true);
      }
    })();
  });

  if (auth.user.id === hostID) gameSettingsRefresh(true);
  else gameSettingsRefresh(false);
}

export function setPlayerIncluded(evt) {
  const playerId = evt.target.getAttribute("player-id");
  if (!options.playerListIncluded.hasOwnProperty(playerId)) return;
  options.playerListIncluded[playerId] = evt.target.checked;
  updateOptions(options);
}

export function setService(_service, fromServer = false, astr = "") {
  ALservice = _service;

  document.getElementById("animeServicebtn").innerHTML = ALservices[ALservice];

  if (fromServer) {
    document.getElementById("currentService").innerText =
      ALservices[ALservice] + astr;
  }
}

export function getService() {
  return ALservice;
}

export async function appendVoiceChannelName(discordSdk, socket, user) {
  const roomName = document.getElementById("roomName");

  let activityChannelName = null;

  // Requesting the channel in GDMs (when the guild ID is null) requires
  // the dm_channels.read scope which requires Discord approval.
  if (discordSdk.channelId != null && discordSdk.guildId != null) {
    // Joining Socket.io Room with name <guildId>/<channelId>
    socket.emit(
      "join-room",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      user
    );
    const channel = await discordSdk.commands.getChannel({
      channel_id: discordSdk.channelId,
    });
    if (channel.name != null) {
      activityChannelName = channel.name;
    }
  }

  // Update the UI with the name of the current voice channel
  roomName.innerHTML = `room: ${activityChannelName}`;
}

export function removeFadeOut(el, speed) {
  if (!el) return;
  let seconds = speed / 1000;
  el.style.transition = "opacity " + seconds + "s ease";

  el.style.opacity = 0;
  setTimeout(function () {
    el.parentNode.removeChild(el);
  }, speed);
}

export function displayMessage(message) {
  const el = document.createElement("li");
  el.innerHTML = message;
  el.style.float = "none";
  document.getElementById("chat").appendChild(el);
  document.getElementById("chat").scrollTop =
    document.getElementById("chat").scrollHeight;
}

export function displayAnnoucement(message, importanceLevel) {
  const container = document.getElementById("notification-container");

  // Create a new notification element
  const notification = document.createElement("div");
  notification.className = "notification";
  notification.textContent = message;

  // Append the notification to the container
  container.appendChild(notification);

  // Trigger the fade-in animation
  requestAnimationFrame(() => {
    notification.classList.add("visible"); // Add the 'visible' class for fade-in
  });

  // Remove the notification after the specified duration
  setTimeout(() => {
    notification.classList.remove("visible"); // Remove 'visible' for fade-out
    notification.classList.add("hidden"); // Add 'hidden' for fade-out animation
    setTimeout(() => {
      container.removeChild(notification); // Remove from DOM
    }, 500); // Wait for the fade-out animation to complete
  }, 5000);
}

export function gameSettingsRefresh(isHost) {
  const queueSize = document.getElementById("queueSize");
  const guessTime = document.getElementById("guessTime");
  const guessesCount = document.getElementById("guessesCount");

  if (isHost) {
    queueSize.removeAttribute("disabled");
    guessTime.removeAttribute("disabled");
    if (options.guessingMode === "SELECTING")
      guessesCount.removeAttribute("disabled");
    else guessesCount.setAttribute("disabled", "true");
  } else {
    queueSize.setAttribute("disabled", "true");
    guessTime.setAttribute("disabled", "true");
    guessesCount.setAttribute("disabled", "true");
  }
}

let didOptionsSetup = false;
export function setupOptionsGUI() {
  if (didOptionsSetup) return;
  // Guessing modes
  let btnSelecting = document.createElement("button");
  btnSelecting.innerHTML = "Selecting";
  btnSelecting.addEventListener("click", () => setGuessMode("SELECTING"));
  document.getElementById("guessMode").append(btnSelecting);

  let btnTyping = document.createElement("button");
  btnTyping.innerHTML = "Typing";
  btnTyping.addEventListener("click", () => setGuessMode("TYPING"));
  document.getElementById("guessMode").append(btnTyping);

  // Theme types
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

  // Anime list service selector
  let btnMal = document.createElement("button");
  btnMal.innerHTML = ALservices[0];
  btnMal.addEventListener("click", () => setService(0));
  document.getElementById("animeService").append(btnMal);

  let btnAl = document.createElement("button");
  btnAl.innerHTML = ALservices[1];
  btnAl.addEventListener("click", () => setService(1));
  document.getElementById("animeService").append(btnAl);

  // Guess options
  let queueSizeInput = document.getElementById("queueSize");
  queueSizeInput.addEventListener("change", () => {
    const val = Math.min(
      queueSizeInput.max,
      Math.max(queueSizeInput.min, queueSizeInput.value)
    );
    queueSizeInput.value = val;
    options.queueSize = val;
    updateOptions(options);
  });

  let guessTimeInput = document.getElementById("guessTime");
  guessTimeInput.addEventListener("change", () => {
    const val = Math.min(
      guessTimeInput.max,
      Math.max(guessTimeInput.min, guessTimeInput.value)
    );
    guessTimeInput.value = val;
    options.guessTime = val;
    updateOptions(options);
  });

  let guessesCount = document.getElementById("guessesCount");
  guessesCount.addEventListener("change", () => {
    const val = Math.min(
      guessesCount.max,
      Math.max(guessesCount.min, guessesCount.value)
    );
    guessesCount.value = val;
    options.guessesCount = val;
    updateOptions(options);
  });

  didOptionsSetup = true;
}

let loadingProgress = 0;
const maxLoadingItems = 4;
export function incrementLoading(state = "") {
  loadingProgress++;
  document.getElementById("loading-progress").value =
    (loadingProgress / maxLoadingItems) * 100;

  document.getElementById("loading-state").innerText = state;

  if (loadingProgress === maxLoadingItems) {
    setTimeout(() => {
      removeFadeOut(document.getElementById("loading"), 500);
    }, 1000);
  }
}

export function toMMSS(seconds) {
  return new Date(seconds * 1000).toISOString().substring(14, 19) || 0;
}

export function preloadMedia(baseName, selectedPlayerType) {
  if (selectedPlayerType == "ogg") {
    // Preload Image
    let tempImg = new Image();
    tempImg.src = `${baseName}.jpg?preload=true`;

    // Preload Audio
    let tempAudio = new Audio();
    tempAudio.src = `${baseName}.ogg?preload=true`;
    tempAudio.preload = "auto";
    tempAudio.muted = true; // Allow loading without sound issues
    tempAudio.play().catch(() => {}); // Play silently to force buffering

    // Fetch more data using the Fetch API
    fetch(`${baseName}.ogg`, {
      method: "GET",
      headers: { Range: "bytes=0-100000" },
    }) // Request first 100KB
      .then((res) => res.blob())
      .catch(() => {});
  } else {
    // Preload Video
    let tempVideo = document.createElement("video");
    tempVideo.src = `${baseName}.webm?preload=true`;
    tempVideo.preload = "auto";
    tempVideo.muted = true;
    tempVideo.play().catch(() => {}); // Auto-play forces buffering

    // Fetch more data using the Fetch API
    fetch(`${baseName}.webm`, {
      method: "GET",
      headers: { Range: "bytes=0-400000" },
    }) // Request first 400KB
      .then((res) => res.blob())
      .catch(() => {});
  }
}

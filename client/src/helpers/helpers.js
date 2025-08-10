import {
  animeServiceButtonEl,
  animeServiceEl,
  chatListEl,
  currentServiceEl,
  guessesCountInputEl,
  guessModeEl,
  guessTimeInputEl,
  loadingProgressEl,
  queueSizeInputEl,
  themeTypeEl,
} from "src/appElements.js";
import {
  setGuessMode,
  setThemeType,
  updateOptions,
} from "src/optionsReload.js";
import { options } from "src/socketCore.js";

let ALservice = 0; // Default to MyAnimeList = 0, 1 = AniList
const ALservices = ["MyAnimeList", "AniList"];

export function setService(_service, fromServer = false, astr = "") {
  ALservice = _service;

  animeServiceButtonEl.innerHTML = ALservices[ALservice];

  if (fromServer) {
    currentServiceEl.innerText = ALservices[ALservice] + astr;
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
  chatListEl.appendChild(el);
  chatListEl.scrollTop = chatListEl.scrollHeight;
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
  if (isHost) {
    queueSizeInputEl.removeAttribute("disabled");
    guessTimeInputEl.removeAttribute("disabled");
    if (options.guessingMode === "SELECTING")
      guessesCountInputEl.removeAttribute("disabled");
    else guessesCountInputEl.setAttribute("disabled", "true");
  } else {
    queueSizeInputEl.setAttribute("disabled", "true");
    guessTimeInputEl.setAttribute("disabled", "true");
    guessesCountInputEl.setAttribute("disabled", "true");
  }
}

let didOptionsSetup = false;
export function setupOptionsGUI() {
  if (didOptionsSetup) return;
  // Guessing modes
  let btnSelecting = document.createElement("button");
  btnSelecting.innerHTML = "Selecting";
  btnSelecting.addEventListener("click", () => setGuessMode("SELECTING"));
  guessModeEl.append(btnSelecting);

  let btnTyping = document.createElement("button");
  btnTyping.innerHTML = "Typing";
  btnTyping.addEventListener("click", () => setGuessMode("TYPING"));
  guessModeEl.append(btnTyping);

  // Theme types
  let btnOP = document.createElement("button");
  btnOP.innerHTML = "OP";
  btnOP.addEventListener("click", () => setThemeType("OP"));
  themeTypeEl.append(btnOP);

  let btnED = document.createElement("button");
  btnED.innerHTML = "ED";
  btnED.addEventListener("click", () => setThemeType("ED"));
  themeTypeEl.append(btnED);

  let btnALL = document.createElement("button");
  btnALL.innerHTML = "ALL";
  btnALL.addEventListener("click", () => setThemeType("ALL"));
  themeTypeEl.append(btnALL);

  // Anime list service selector
  let btnMal = document.createElement("button");
  btnMal.innerHTML = ALservices[0];
  btnMal.addEventListener("click", () => setService(0));
  animeServiceEl.append(btnMal);

  let btnAl = document.createElement("button");
  btnAl.innerHTML = ALservices[1];
  btnAl.addEventListener("click", () => setService(1));
  animeServiceEl.append(btnAl);

  // Guess options
  queueSizeInputEl.addEventListener("change", () => {
    const val = Math.min(
      Number(queueSizeInputEl.max),
      Math.max(Number(queueSizeInputEl.min), Number(queueSizeInputEl.value))
    );
    queueSizeInputEl.value = val.toString();
    options.queueSize = val;
    updateOptions(options);
  });

  guessTimeInputEl.addEventListener("change", () => {
    const val = Math.min(
      Number(guessTimeInputEl.max),
      Math.max(Number(guessTimeInputEl.min), Number(guessTimeInputEl.value))
    );
    guessTimeInputEl.value = val.toString();
    options.guessTime = val;
    updateOptions(options);
  });

  guessesCountInputEl.addEventListener("change", () => {
    const val = Math.min(
      Number(guessesCountInputEl.max),
      Math.max(
        Number(guessesCountInputEl.min),
        Number(guessesCountInputEl.value)
      )
    );
    guessesCountInputEl.value = val.toString();
    options.guessesCount = val;
    updateOptions(options);
  });

  didOptionsSetup = true;
}

let loadingProgress = 0;
const maxLoadingItems = 4;
export function incrementLoading(state = "") {
  loadingProgress++;
  loadingProgressEl.value = (loadingProgress / maxLoadingItems) * 100;

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

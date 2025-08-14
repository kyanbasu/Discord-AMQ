// Exports constant HTML elements from window

// Main
export const loadingProgressEl = /** @type {HTMLProgressElement} */ (
  document.getElementById("loading-progress")
);

// FocusZone
export const playerContainerEl = /** @type {HTMLDivElement} */ (
  document.getElementById("player")
);

export const videoPlayerImgBgEl = /** @type {HTMLImageElement} */ (
  document.getElementById("videoPlayerImgBg")
);

export const videoPlayerEl =
  /** @type {HTMLVideoElement & {triggeredSkip: Boolean}} */ (
    document.getElementById("videoPlayer")
  );

export const videoPlayerImgEl = /** @type {HTMLImageElement} */ (
  document.getElementById("videoPlayerImg")
);

export const skipButtonEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("Skip")
);

export const themeTitleEl = /** @type {HTMLHeadingElement} */ (
  document.getElementById("themeTitle")
);

export const optionsEl = /** @type {HTMLDivElement} */ (
  document.getElementById("options")
);

// Options
export const animeListNameEl = /** @type {HTMLInputElement} */ (
  document.getElementById("animelistname")
);

export const animeServiceButtonEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("animeServicebtn")
);

export const animeServiceEl = /** @type {HTMLDivElement} */ (
  document.getElementById("animeService")
);

export const currentServiceEl = /** @type {HTMLLabelElement} */ (
  document.getElementById("currentService")
);

export const lastAnimeListUpdateEl = /** @type {HTMLLabelElement} */ (
  document.getElementById("lastAnimeListUpdate")
);

export const updateAnimeListButtonEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("UpdateAnimeList")
);

export const queueSizeInputEl = /** @type {HTMLInputElement} */ (
  document.getElementById("queueSize")
);

export const guessTimeInputEl = /** @type {HTMLInputElement} */ (
  document.getElementById("guessTime")
);

export const guessesCountInputEl = /** @type {HTMLInputElement} */ (
  document.getElementById("guessesCount")
);

export const guessModeButtonEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("guessModebtn")
);

export const guessModeEl = /** @type {HTMLDivElement} */ (
  document.getElementById("guessMode")
);

export const themeTypeButtonEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("themeTypebtn")
);

export const themeTypeEl = /** @type {HTMLDivElement} */ (
  document.getElementById("themeType")
);

export const includedPlayerListsEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("includedPlayerLists")
);

export const guessingZoneEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("guessingZone")
);

// SecondZone
export const playPauseEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("PlayPause")
);

export const chatListEl = /** @type {HTMLUListElement} */ (
  document.getElementById("chat")
);

export const chatInputEl = /** @type {HTMLInputElement} */ (
  document.getElementById("chatin")
);

export const chatButtonEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("chatbtn")
);

export const playerTypeSwitchEl = /** @type {HTMLInputElement} */ (
  document.getElementById("playerTypeSwitch")
);

export const volumeSliderEl = /** @type {HTMLInputElement} */ (
  document.getElementById("volume-slider")
);

export const settingsButtonEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("chatContainer")
);

export const chatContainerEl = /** @type {HTMLDivElement} */ (
  document.getElementById("chatContainer")
);

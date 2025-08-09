// Exports constant HTML elements from window

// Main
export const loadingProgressEl = /** @type {HTMLProgressElement} */ (
  document.getElementById("loading-progress")
);

// FocusZone
export const videoPlayerEl =
  /** @type {HTMLVideoElement & {triggeredSkip: Boolean}} */ (
    document.getElementById("videoPlayer")
  );

export const videoPlayerImgEl = /** @type {HTMLImageElement} */ (
  document.getElementById("videoPlayerImg")
);

export const videoPlayerImgBgEl = /** @type {HTMLImageElement} */ (
  document.getElementById("videoPlayerImgBg")
);

export const playerContainerEl = document.getElementById("player");

export const volumeSliderEl = /** @type {HTMLInputElement} */ (
  document.getElementById("volume-slider")
);

// Options
export const animeListNameEl = /** @type {HTMLInputElement} */ (
  document.getElementById("animelistname")
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

// SecondZone
export const playPauseEl = /** @type {HTMLButtonElement} */ (
  document.getElementById("PlayPause")
);

export const chatInputEl = /** @type {HTMLInputElement} */ (
  document.getElementById("chatin")
);

export const playerTypeSwitchEl = /** @type {HTMLInputElement} */ (
  document.getElementById("playerTypeSwitch")
);

//export const animeTextGuess = /** @type {} */ document.getElementById("animeTextGuess");

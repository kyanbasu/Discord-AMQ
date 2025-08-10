import {
  guessesCountInputEl,
  guessingZoneEl,
  guessModeButtonEl,
  guessTimeInputEl,
  playPauseEl,
  queueSizeInputEl,
  themeTypeButtonEl,
} from "./appElements.js";

import { auth, discordSdk } from "./discordSetup.js";
import { gameSettingsRefresh } from "./helpers/helpers.js";
import { UpdateTextGuessAutocomplete } from "./main.js";
import { options, socket } from "./socketCore.js";

let autocompleteList;

/*
Options are:
 .guessesCount
   amount of guess buttons, min 1, only applied when guessingMode is SELECTING
 .guessingMode
   SELECTING - gives some answers to pick from
   TYPING - need to write entire name (with help of autocomplete)
*/
export function optionsReload(hostID) {
  guessingZoneEl.innerHTML = ""; // clears guessing zone

  //currently only works with picker
  switch (options.guessingMode) {
    case "SELECTING":
      for (let i = 0; i < options.guessesCount; i++) {
        const el = /** @type {HTMLButtonElement & {index: number}} */ (
          document.createElement("button")
        );
        el.id = `guess${i}`;
        el.addEventListener("click", GuessSelection);
        el.index = i;
        guessingZoneEl.append(el);
      }
      break;

    case "TYPING":
      guessingZoneEl.innerHTML = `
        <div class="autocomplete">
          <input
            type="text"
            id="animeTextGuess"
            name="animeTextGuess"
            placeholder="enter guess..."
          />
          <div id="autocomplete-list" class="autocomplete-items"></div>
        </div>`;

      document
        .getElementById("animeTextGuess")
        .addEventListener("input", UpdateTextGuessAutocomplete);

      autocompleteList = document.getElementById("autocomplete-list");
      break;

    default:
      break;
  }

  themeTypeButtonEl.innerHTML = options.themeType;
  guessModeButtonEl.innerHTML = (() => {
    switch (options.guessingMode) {
      case "SELECTING":
        return "Selecting";
      case "TYPING":
        return "Typing";
      default:
        return "unknown";
    }
  })();
  queueSizeInputEl.value = options.queueSize;
  guessTimeInputEl.value = options.guessTime;
  guessesCountInputEl.value = options.guessesCount;

  if (options.novideo) {
    document
      .getElementById("playerTypeSwitch")
      .dispatchEvent(new Event("change"));
  }

  Object.entries(options.playerList).forEach(
    ([playerId, { included, entries }]) => {
      const checkbox = /** @type {HTMLInputElement} */ (
        document.getElementById(`checkbox-${playerId}`)
      );
      if (checkbox) {
        checkbox.checked = included;
      }
      const entriesLabel = document.getElementById(
        `player-entries-${playerId}`
      );
      if (entriesLabel) {
        entriesLabel.textContent = `(${entries} entries)`;
      }
    }
  );

  if (auth.user.id === hostID) gameSettingsRefresh(true);
  else gameSettingsRefresh(false);
}

export function setGuessMode(mode) {
  options.guessingMode = mode;
  updateOptions(options);
}

export function setThemeType(type) {
  options.themeType = type;
  updateOptions(options);
}

let pendingOptionsUpdate = null;

export function updateOptions(options) {
  playPauseEl.disabled = true;
  clearTimeout(pendingOptionsUpdate);
  pendingOptionsUpdate = setTimeout(() => {
    socket.emit(
      "updateOptions",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      auth.user,
      options
    );
    playPauseEl.disabled = false;
  }, 1000);
}

function GuessSelection(evt) {
  socket.emit("guess", auth.user, evt.currentTarget.index + 1);
  for (let i = 0; i < options.guessesCount; i++) {
    document.getElementById(`guess${i}`).classList.remove("guessButton");
  }
  document
    .getElementById(`guess${evt.currentTarget.index}`)
    .classList.add("guessButton");
}

export { autocompleteList };


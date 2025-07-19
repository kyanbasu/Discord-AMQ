import { auth, discordSdk, UpdateTextGuessAutocomplete } from "./main.js";
import { socket, options } from "./sockets.js";

let autocompleteList;

/*
Options are:
 .guessesCount
   amount of guess buttons, min 1, only applied when guessingMode is SELECTING
 .guessingMode
   SELECTING - gives some answers to pick from
   TYPING - need to write entire name (with help of autocomplete)
*/
export function optionsReload() {
  document.getElementById("guessingZone").innerHTML = ""; // clears guessing zone

  //currently only works with picker
  switch (options.guessingMode) {
    case "SELECTING":
      for (let i = 0; i < options.guessesCount; i++) {
        const el = document.createElement("button");
        el.id = `guess${i}`;
        el.addEventListener("click", GuessSelection);
        el.index = i;
        document.getElementById("guessingZone").append(el);
      }
      break;

    case "TYPING":
      document.getElementById("guessingZone").innerHTML = `
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

  document.getElementById("themeTypebtn").innerHTML = (() => {
    switch (options.themeType) {
      case 0:
        return "OP";
      case 1:
        return "ED";
      case 2:
        return "ALL";
      default:
        return "OP";
    }
  })();
  document.getElementById("queueSize").value = options.queueSize;
  document.getElementById("guessTime").value = options.guessTime;
  document.getElementById("guessesCount").value = options.guessesCount;

  if (options.novideo) {
    document
      .getElementById("playerTypeSwitch")
      .dispatchEvent(new Event("change"));
  }

  Object.entries(options.playerListIncluded).forEach(
    ([playerId, isIncluded]) => {
      const checkbox = document.getElementById(`checkbox-${playerId}`);
      if (checkbox) {
        checkbox.checked = isIncluded;
      }
    }
  );
}

export function setThemeType(type) {
  options.themeType = type;
  updateOptions(options);
}

let pendingOptionsUpdate = null;

export function updateOptions(options) {
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

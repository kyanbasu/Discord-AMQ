import { auth, discordSdk } from "./main.js";
import { socket, options } from "./sockets.js";
import { displayAnnoucement } from "./helpers.js";

/*
Options are:
 .guessesCount
   amount of guess buttons, min 1, only applied when guessType is 0
 .guessType
   0 - picker, gives some answers to pick from
   1 - input, need to write entire name (with help of autocomplete)
*/
export function optionsReload() {
  document.getElementById("guessingZone").innerHTML = ""; // clears guessing zone

  //TODO: guessTypes idk
  options.guessType = 0;

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

function Guess(evt) {
  socket.emit("guess", auth.user, evt.currentTarget.index + 1);
  for (let i = 0; i < options.guessesCount; i++) {
    document.getElementById(`guess${i}`).classList.remove("guessButton");
  }
  document
    .getElementById(`guess${evt.currentTarget.index}`)
    .classList.add("guessButton");
}

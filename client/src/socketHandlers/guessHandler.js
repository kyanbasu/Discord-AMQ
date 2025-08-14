import {
  guessingZoneEl,
  playerContainerEl,
  skipButtonEl,
  themeTitleEl,
} from "src/appElements.js";
import { auth } from "src/discordSetup.js";
import { displayMessage } from "src/helpers/helpers.js";
import { animeTextGuess, autocompleteList } from "src/optionsReload.js";
import { clientSettings } from "src/socketCore.js";

export function handleGuessing(socket) {
  socket.on("correctGuess", (title, themeType, usr) => {
    themeTitleEl.innerText = `${title[clientSettings.themeLang]} ${themeType}`;
    playerContainerEl.hidden = false;
    autocompleteList.innerHTML = "";
    guessingZoneEl.hidden = true;
    displayMessage(
      `That was ${
        title[clientSettings.themeLang]
      } ${themeType} from ${usr}'s list`
    );
    setTimeout(() => {
      skipButtonEl.hidden = false;
    }, 3000);
  });

  socket.on("correctlyGuessed", (e) => {
    displayMessage(
      `<span style="color: var(--maincontrast)"> Correctly guessed: ${e}</span>`
    );
  });

  socket.on("autocompleteResults", (results) => {
    if (results.length === 0) return;
    console.log(results);

    autocompleteList.innerHTML = "";
    results.forEach((result) => {
      const div = document.createElement("div");
      div.className = "autocompleteItem";
      div.innerHTML = `<strong>${
        result.title[clientSettings.themeLang]
      }</strong>`;
      div.addEventListener("click", () => {
        animeTextGuess.value = result.title[clientSettings.themeLang];
        console.log("clicked ", result.id);
        socket.emit("guess", auth.user, result.id);
        autocompleteList.innerHTML = "";
      });
      autocompleteList.appendChild(div);
    });
  });
}

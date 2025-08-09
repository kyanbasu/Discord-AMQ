import { auth } from "../discordSetup";
import { displayMessage } from "../helpers/helpers";
import { player } from "../main";
import { autocompleteList } from "../optionsReload";
import { clientSettings } from "../socketCore";

export function handleGuessing(socket) {
  socket.on("correctGuess", (title, themeType, usr) => {
    document.getElementById("themeTitle").innerText = `${
      title[clientSettings.themeLang]
    } ${themeType}`;
    player.hidden = false;
    autocompleteList.innerHTML = "";
    document.getElementById("guessingZone").hidden = true;
    displayMessage(
      `That was ${
        title[clientSettings.themeLang]
      } ${themeType} from ${usr}'s list`
    );
    setTimeout(() => {
      document.getElementById("Skip").hidden = false;
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
      div.innerHTML = `<strong>${
        result.title[clientSettings.themeLang]
      }</strong>`;
      div.addEventListener("click", () => {
        document.getElementById("animeTextGuess").value =
          result.title[clientSettings.themeLang];
        console.log("clicked ", result.id);
        socket.emit("guess", auth.user, result.id);
        autocompleteList.innerHTML = "";
      });
      autocompleteList.appendChild(div);
    });
  });
}

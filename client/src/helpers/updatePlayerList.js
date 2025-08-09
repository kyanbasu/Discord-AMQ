import crownSrc from "/static/crown.svg";

import { runningLocally } from "../main";
import { auth } from "../discordSetup";
import { options } from "../socketCore";
import { updateOptions } from "../optionsReload";
import { gameSettingsRefresh } from "./helpers";

var players = {};

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

function setPlayerIncluded(evt) {
  const playerId = evt.target.getAttribute("player-id");
  if (!options.playerList.hasOwnProperty(playerId)) return;
  options.playerList[playerId].included = evt.target.checked;
  updateOptions(options);
}

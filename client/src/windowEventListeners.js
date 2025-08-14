import {
  chatButtonEl,
  chatInputEl,
  playerTypeSwitchEl,
} from "./appElements.js";
import { auth, discordSdk } from "./discordSetup.js";
import { displayAnnoucement } from "./helpers/helpers.js";
import { animeTextGuess, autocompleteList } from "./optionsReload.js";
import { options, socket } from "./socketCore.js";

export { selectedPlayerType };

// Switching between playing audio/video of a theme
let selectedPlayerType = "ogg";
playerTypeSwitchEl.addEventListener("change", () => {
  if (options.novideo && playerTypeSwitchEl.checked) {
    playerTypeSwitchEl.checked = false;
    displayAnnoucement(
      "Video is disabled on the server, using audio only mode",
      1
    );
    selectedPlayerType = "ogg";
    return;
  }
  if (playerTypeSwitchEl.checked) selectedPlayerType = "webm";
  else selectedPlayerType = "ogg";
});

// Chat messages
chatButtonEl.onclick = () => {
  sendMessage();
};
chatInputEl.onkeyup = (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
};
function sendMessage() {
  const text = chatInputEl.value;
  if (text.length > 0 && auth)
    socket.emit(
      "message",
      `${discordSdk.guildId}/${discordSdk.channelId}`,
      `${auth.user.global_name}: ${text}`
    );
  chatInputEl.value = "";
}

let autocompleteSelectedIndex = -1;
export function resetAutocompleteSelection() {
  autocompleteSelectedIndex = -1;
}

export function registerAutocompleteNavigation() {
  function items() {
    return Array.from(autocompleteList.querySelectorAll(".autocompleteItem"));
  }

  function ensureId(el, i) {
    if (!el.id) el.id = "list-item-" + i;
    return el.id;
  }

  function updateSelection(newIndex) {
    const list = items();
    if (list.length === 0) {
      autocompleteSelectedIndex = -1;
      autocompleteList.removeAttribute("aria-activedescendant");
      return;
    }

    // wrap index (looping)
    newIndex = ((newIndex % list.length) + list.length) % list.length;

    list.forEach((el, i) => {
      const isSelected = i === newIndex;
      el.classList.toggle("selected", isSelected);
      el.setAttribute("aria-selected", isSelected ? "true" : "false");
      if (isSelected) {
        ensureId(el, i);
        autocompleteList.setAttribute("aria-activedescendant", el.id);
        // bring into view when navigating
        el.scrollIntoView({ block: "nearest" });
      }
    });

    autocompleteSelectedIndex = newIndex;
  }

  animeTextGuess.addEventListener("keydown", function (e) {
    const key = e.key;

    if (key === "ArrowDown") {
      e.preventDefault();
      // if nothing selected, go to first; otherwise go next (with loop)
      if (autocompleteSelectedIndex === -1) updateSelection(0);
      else updateSelection(autocompleteSelectedIndex + 1);
    } else if (key === "ArrowUp") {
      e.preventDefault();
      // if nothing selected, go to last; otherwise go previous (with loop)
      if (autocompleteSelectedIndex === -1) updateSelection(items().length - 1);
      else updateSelection(autocompleteSelectedIndex - 1);
    } else if (key === "Enter" || key === " " || key === "Spacebar") {
      // Enter or Space = click on selected item
      if (autocompleteSelectedIndex !== -1) {
        e.preventDefault(); // prevent page scroll on Space
        const el = items()[autocompleteSelectedIndex];
        if (el) el.click(); // triggers click handlers on that element
      }
    }
  });
}

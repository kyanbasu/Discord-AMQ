import crownSrc from "/static/crown.svg";

const isMobile = () => {
  return navigator.userAgentData && navigator.userAgentData.mobile;
};

export async function appendUserAvatar(user, isHost = false) {
  const navbar = document.getElementById("navbar");

  let avatarSrc = "";
  if (user.avatar) {
    avatarSrc = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
  } else {
    const defaultAvatarIndex = Math.abs(Number(auth.user.id) >> 22) % 6;
    avatarSrc = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
  }
  const container = document.createElement("div");
  container.setAttribute(
    "style",
    "display:flex;align-items:center;max-width:100px"
  );

  const avatarImg = document.createElement("img");
  avatarImg.setAttribute("src", avatarSrc);
  avatarImg.setAttribute("height", "80%");
  avatarImg.setAttribute("style", "border-radius: 50%;");

  container.appendChild(avatarImg);

  if (isHost) {
    const crownImg = document.createElement("img");
    crownImg.setAttribute("src", crownSrc);
    crownImg.setAttribute(
      "style",
      `position:absolute;height:16px;top:${
        isMobile ? "0" : "40px"
      };margin-left:4px;`
    );
    container.appendChild(crownImg);
  }

  navbar.appendChild(container);
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
  var seconds = speed / 1000;
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
  document.getElementById("chat").appendChild(el);
  document.getElementById("chat").scrollTop =
    document.getElementById("chat").scrollHeight;
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

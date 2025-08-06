import { DiscordSDK } from "@discord/embedded-app-sdk";
import * as Sentry from "@sentry/browser";
import { appendVoiceChannelName, incrementLoading } from "./helpers/helpers";

import { setupSocket, socket } from "./sockets";

export { dscstatus, discordSdk, auth };

// Will eventually store the authenticated user's access_token
var auth;

var discordSdk;

async function setupDiscordSdk(discordSdk) {
  await discordSdk.ready();

  console.log("Discord SDK is ready");

  // Authorize with Discord Client
  const { code } = await discordSdk.commands
    .authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify", "guilds", "rpc.activities.write"],
    })
    .catch((e) => {
      console.log(JSON.stringify(e));
    });

  // Retrieve an access_token from your activity's server
  const response = await fetch("/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
    }),
  }).catch((e) => {
    console.log(JSON.stringify(e));
  });

  const { access_token } = await response.json();

  if (!access_token) {
    document.getElementById("loadingInside").innerHTML +=
      "<p>Failed to get access token, please try to restart app in a moment, most likely being ratelimited</p>";
    throw new Error("Access token not found");
  }

  // Authenticate with Discord client (using the access_token)
  const auth = await discordSdk.commands
    .authenticate({
      access_token,
    })
    .catch((e) => {
      console.log(JSON.stringify(e));
    });

  if (auth == null) {
    throw new Error("Authenticate command failed");
  } else {
    return auth;
  }
}

export async function connectDiscord() {
  discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

  incrementLoading("Connecting to Discord");
  //removeFadeOut(document.getElementById('loading'), 500) //remove this in prod
  auth = await setupDiscordSdk(discordSdk);

  console.log("Discord SDK is authenticated");
  incrementLoading("Connecting to server");

  setupSocket(auth.access_token);

  incrementLoading("Authenticating with server");

  await new Promise((resolve, reject) => {
    socket.once("authenticated", (user) => {
      console.log("Authenticated with server as " + user.id);
      resolve(user);
    });
  });

  //discordSdk configs
  await discordSdk.commands.setActivity(dscstatus);
  /*
  await discordSdk.commands.setConfig({
    use_interactive_pip: true
  })*/
  Sentry.setUser({
    id: auth.user.id,
    username: auth.user.global_name || auth.user.username,
  });
  Sentry.setTag("guildId", discordSdk.guildId);
  Sentry.setTag("channelId", discordSdk.channelId);

  Sentry.setUser({
    id: auth.user.id,
    username: auth.user.global_name || auth.user.username,
  });
  Sentry.setTag("guildId", discordSdk.guildId);
  Sentry.setTag("channelId", discordSdk.channelId);

  appendVoiceChannelName(discordSdk, socket, auth.user);

  const handleLayoutModeUpdate = (update) => {
    if (update.layout_mode <= 0) {
      // UNHANDLED or FOCUSED
      player.classList.remove("playerPIP");
    } else {
      // PIP, GRID
      player.classList.add("playerPIP");
    }
  };

  discordSdk.subscribe("ACTIVITY_LAYOUT_MODE_UPDATE", handleLayoutModeUpdate);
}

export function connectFakeDiscord() {
  incrementLoading("Skipping discord connection.");

  discordSdk = {
    guildId: 1,
    channelId: 1,
    commands: {
      getChannel: (...a) => {
        return { name: "test" };
      },
      setActivity: (...a) => {},
    },
  };

  auth = {
    user: {
      username: "testuser",
      discriminator: "0",
      id: "1",
      avatar: "",
      global_name: "test",
    },
  };

  incrementLoading("Connecting to server");

  setupSocket(auth.user);

  incrementLoading("Skipping server verification");

  appendVoiceChannelName(discordSdk, socket, auth.user);
}

let dscstatus = {
  activity: {
    type: 0,
    details: "In the lobby",
    assets: {
      large_text: "change this in prod",
      small_image: "map-mainframe",
      small_text: "in Mainframe",
    },
    timestamps: {
      start: Math.floor(Date.now() / 1000),
    },
  },
};

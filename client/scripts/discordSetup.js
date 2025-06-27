export async function setupDiscordSdk(discordSdk) {
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
    document.getElementById("loading").innerHTML +=
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

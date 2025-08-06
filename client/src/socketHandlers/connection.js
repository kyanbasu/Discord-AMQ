import { auth, discordSdk } from "../discordSetup";
import { displayMessage } from "../helpers/helpers";

import * as Sentry from "@sentry/browser";
import { socket } from "../sockets";

export function handleConnection(socket) {
  socket.on("disconnect", (reason, details) => {
    Sentry.withScope((scope) => {
      console.log(details);
      scope.setExtra("details", details);
      Sentry.captureException(Error(`User disconnected, reason: ${reason}`));
    });

    displayMessage(`disconnected... reason: ${reason}`);
    console.log("reason: ", reason);

    if (reason !== "ping timeout") {
      reconnect();
    }
  });

  socket.on("connect_error", (err) => {
    if (err.message === "failed auth" || err.message === "no token") {
      console.error(err);
      document.getElementById("loading-state").innerHTML +=
        "</br>Invalid token. Restart app.";
      socket.close();
      return;
    }
    console.error("Connection error:", err);
    Sentry.withScope((scope) => {
      console.log(err);
      scope.setExtra("error", err);
      Sentry.captureException(Error(`User connect_error: ${err}`));
    });

    reconnect();
  });

  socket.io.on("reconnect_attempt", (num) => {
    console.log(`Reconnection attempt #${num}`);
    displayMessage(`Reconnecting...`);
  });

  socket.io.on("reconnect", () => {
    displayMessage("Connected");
    resync();
  });

  // Optional retry limit or fallback logic in reconnect_failed
  socket.io.on("reconnect_failed", () => {
    console.error("Reconnect unsuccessful, prompt for manual reload");
    displayMessage("Reconnect failed");
  });

  socket.on("connect", () => {
    displayMessage("Connected");

    socket.io.engine.on("upgrade", (transport) => {
      console.log(`transport upgraded to ${transport.name}`);
    });
  });
}

function reconnect() {
  setTimeout(async () => {
    socket.open();

    // Wait for authentication before resync
    await new Promise((resolve) => {
      socket.once("authenticated", resolve);
    });

    resync();
  }, 500);
}

function resync() {
  socket.emit(
    "client-resync",
    `${discordSdk.guildId}/${discordSdk.channelId}`,
    auth.user
  );
}

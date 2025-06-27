# Discord Anime Music Quiz Activity

# Installing

Run `bun install` on server and `npm install` on client.
You also need `cloudflared` for tunneling for discord proxy.

# Running

## Server
```
$ cd server
$ bun run server.ts
```

You can use `--no-video` flag to disable video caching and providing on the server.

## Client
```
$ cd client
$ npm run dev
```
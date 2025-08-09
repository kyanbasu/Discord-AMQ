interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_SENTRY_ENVIRONMENT: string;
  readonly VITE_RUN_LOCAL: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_TUNNEL_HOST: string;
  readonly VITE_SERVER_ADDRESS: string;
  readonly VITE_SERVER_PORT: string;

  // allow other keys without yelling
  [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: {
    on: function;
  };
}

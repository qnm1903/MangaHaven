/// <reference types="vite/client" />

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_OAUTH_CLIENT_ID: string;
  readonly OAUTH_CLIENT_SECRET: string;
  readonly PORT: number;
  readonly POSTGRES_URL: string;
  readonly JWT_SECRET: string;
  readonly SECRET_ACCESS: string;
  readonly SECRET_REFRESH: string;
  readonly REDIS_HOST: string;
  readonly REDIS_PORT: number;
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
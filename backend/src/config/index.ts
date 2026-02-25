export const googleOAuthConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-jwt-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

export const serverConfig = {
  port: parseInt(process.env.PORT || '5000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

export const databaseConfig = {
  url: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_DATABASE_URL || '',
};

export const mangadexConfig = {
  id: process.env.mangadex_ID || '',
  secret: process.env.mangadex_SECRET || '',
}

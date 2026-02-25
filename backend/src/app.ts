import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth_routes';
import userRoutes from './routes/user_routes';
import mangaRoutes from './routes/manga_routes';
import adminRoutes from './routes/admin_routes';
import searchRoutes from './routes/search_routes';
import groupRoutes from './routes/group_routes';
import authorRoutes from './routes/author_routes';
import commentRoutes from './routes/comment_routes';
import followRoutes from './routes/follow_routes';
import compression from 'compression';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middlewares/auth_error_middleware';
import { globalLimiter } from './middlewares/rate_limit';

const app: Express = express();

// Trust proxy (nginx / Cloudflare) để req.ip trả về IP thật
app.set('trust proxy', 1);

// Basic security headers for API responses
app.use(
  helmet({
    contentSecurityPolicy: false, // Server response = JSON
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false, // Tắt để tránh break tài nguyên cross-origin
    hsts: process.env.NODE_ENV === 'production',
  }),
);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(compression({
  level: 6, // Mức độ compress
  threshold: 100 * 1000,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false; // Không nén nếu có header này
    }
    return compression.filter(req, res); // Sử dụng filter mặc định của compression
  }
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Global rate limit: 300 req / 5 phút / IP
app.use(globalLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/manga', mangaRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/authors', authorRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/follows', followRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'MangaVerse Auth Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Error handling middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction): any => {
  console.log(err);
  if (process.env.NODE_ENV === 'production') {
    const frontendURL: string = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${frontendURL}/404`);
  } else {
    if (err) {
      console.error(err);
      return res.status(500).json({
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(500).json({
        message: 'An unexpected error occurred',
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
});

export default app;
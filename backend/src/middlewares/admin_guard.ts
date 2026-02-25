import type { RequestHandler } from 'express';
import { authenticateToken, requireRole } from './auth_middleware';

export const adminGuard: RequestHandler[] = [authenticateToken, requireRole(['ADMIN'])];

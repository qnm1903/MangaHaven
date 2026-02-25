import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../exceptions/http_exception';

export const errorHandler = (
  error: Error | HttpException,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let status = 500;
  let message = 'Internal Server Error';

  if (error instanceof HttpException) {
    status = error.status;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    status = 400;
    message = error.message;
  } else if (error.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};
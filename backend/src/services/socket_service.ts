import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { JWTUtils } from '../utils/jwt';

let io: SocketIOServer | null = null;

export const initSocketServer = (httpServer: HttpServer) => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
    });

    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            // Allow anonymous connection for reading comments only?
            // For now, let's allow everyone to connect, but maybe restrict actions later.
            // Actually, if we want real-time updates for everyone (including guests), we should allow connection.
            return next();
        }

        try {
            const payload = JWTUtils.verifyAccessToken(token);
            socket.data.user = payload;
            next();
        } catch (err) {
            // Token invalid but we still allow connection as guest?
            // Or reject? Let's allow guest for now.
            next();
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log(`Socket connected: ${socket.id} (User: ${socket.data.user?.userId || 'Guest'})`);

        // Join a chapter room to receive comments
        socket.on('join_chapter', (chapterId: string) => {
            if (!chapterId) return;

            const roomName = `chapter:${chapterId}`;
            socket.join(roomName);
            console.log(`Socket ${socket.id} joined ${roomName}`);
        });

        // Leave a chapter room
        socket.on('leave_chapter', (chapterId: string) => {
            if (!chapterId) return;

            const roomName = `chapter:${chapterId}`;
            socket.leave(roomName);
            console.log(`Socket ${socket.id} left ${roomName}`);
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    console.log('Socket.io server initialized');
    return io;
};

export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
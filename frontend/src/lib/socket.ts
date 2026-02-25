import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
    if (!socket) {
        const token = localStorage.getItem('accessToken');

        socket = io(BACKEND_URL, {
            auth: {
                token: token || undefined,
            },
            withCredentials: true,
            autoConnect: false,
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket?.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (err: Error) => {
            console.error('Socket connection error:', err.message);
        });
    }

    if (!socket.connected) {
        // Update token in case it changed
        const token = localStorage.getItem('accessToken');
        if (token) {
            socket.auth = { token };
        }
        socket.connect();
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
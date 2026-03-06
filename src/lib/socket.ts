import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
}
//sqalom

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

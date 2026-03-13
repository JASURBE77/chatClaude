import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('token');
    socket = io(import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    let connectErrorCount = 0;
    socket.on('connect_error', (err) => {
      console.warn('Socket connect error:', err.message);
      connectErrorCount++;
      // 3 marta urinishdan keyin foydalanuvchini xabardor qilamiz
      if (connectErrorCount === 3) {
        alert(`Server bilan ulanishda xato: ${err.message}\nIltimos, sahifani yangilang yoki keyinroq urinib ko'ring.`);
      }
    });

    socket.on('connect', () => {
      connectErrorCount = 0;
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

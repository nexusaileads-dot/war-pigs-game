import { io, Socket } from 'socket.io-client';
import { API_URL } from './client'; // This pulls your existing backend URL

// We set autoConnect to false so it doesn't connect until the user actually enters the PvP queue
export const socket: Socket = io(API_URL, {
  autoConnect: false,
  withCredentials: true,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

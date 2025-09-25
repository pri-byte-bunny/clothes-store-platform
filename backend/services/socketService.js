const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their room for notifications
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
    });

    // Handle bargain messages
    socket.on('bargain-message', (data) => {
      socket.to(`user-${data.recipientId}`).emit('bargain-update', data);
    });

    // Handle order updates
    socket.on('order-update', (data) => {
      socket.to(`user-${data.buyerId}`).emit('order-status-update', data);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const sendNotificationToUser = (userId, event, data) => {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
};

module.exports = { initSocket, getIO, sendNotificationToUser };

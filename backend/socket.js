// socket.js
let io;
const connectedUsers = new Map(); // Map to store userId -> socketId

function initSocket(server) {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: "*", // dev only; restrict later if you want
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // Handle user joining (authentication)
    socket.on("user:join", (userId) => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`); // Join user-specific room
        console.log(`👤 User ${userId} joined with socket ${socket.id}`);
      }
    });

    /**
     * Handle private message events from Socket (optional direct socket messaging).
     * Note: Main private messaging is done via HTTP POST which triggers socket emit from controller.
     * This handler is for direct socket-to-socket messaging if needed.
     */
    socket.on("private:message", (data) => {
      const { receiverId, message } = data;

      if (!socket.userId || !receiverId) {
        console.log("⚠️ private:message - Missing userId or receiverId");
        return;
      }

      // Emit to receiver's room if they're online
      socket.to(`user:${receiverId}`).emit("private:new-message", {
        message,
        participants: [socket.userId, receiverId],
      });

      console.log(`💬 Private message from ${socket.userId} to ${receiverId}`);
    });

    // Handle typing indicators for private messages
    socket.on("private:typing", (data) => {
      const { receiverId, isTyping } = data;
      socket.to(`user:${receiverId}`).emit("private:typing", {
        senderId: socket.userId,
        isTyping,
      });
    });

    // ===============================
    //        VIDEO CALL SIGNALING
    // ===============================

    // Caller -> send offer to callee
    socket.on("call:offer", ({ toUserId, sdp }) => {
      if (!socket.userId || !toUserId || !sdp) return;

      console.log(`📞 Call offer from ${socket.userId} to ${toUserId}`);

      // Send to callee's user room
      socket.to(`user:${toUserId}`).emit("call:incoming", {
        fromUserId: socket.userId,
        sdp,
      });
    });

    // Callee -> send answer back to caller
    socket.on("call:answer", ({ toUserId, sdp }) => {
      if (!socket.userId || !toUserId || !sdp) return;

      console.log(`✅ Call answer from ${socket.userId} to ${toUserId}`);

      socket.to(`user:${toUserId}`).emit("call:accepted", {
        fromUserId: socket.userId,
        sdp,
      });
    });

    // Both peers -> exchange ICE candidates
    socket.on("call:candidate", ({ toUserId, candidate }) => {
      if (!socket.userId || !toUserId || !candidate) return;

      // Just forward candidate to other user
      socket.to(`user:${toUserId}`).emit("call:candidate", {
        candidate,
      });
    });

    // Either peer -> end call
    socket.on("call:end", ({ toUserId }) => {
      if (!socket.userId || !toUserId) return;

      console.log(`📴 Call ended by ${socket.userId}, notifying ${toUserId}`);

      socket.to(`user:${toUserId}`).emit("call:ended");
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);

      // Remove user from connected users map
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        console.log(`👤 User ${socket.userId} disconnected`);
      }
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
}

// Helper function to check if user is online
function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

// Helper function to get connected users
function getConnectedUsers() {
  return Array.from(connectedUsers.keys());
}

module.exports = { initSocket, getIO, isUserOnline, getConnectedUsers };

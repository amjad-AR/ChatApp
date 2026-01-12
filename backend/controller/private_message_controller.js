// controller/private_message_controller.js
const Message = require("../model/message_model");
const User = require("../model/user_model");
const { getIO } = require("../socket");

// @desc  Send private message to another user
// @route POST /api/messages/private
// @access Private
exports.sendPrivateMessage = async (req, res) => {
  try {
    const { text, imageBase64, audioBase64, receiver_id } = req.body;

    // ✅ At least text OR image OR audio is required
    if ((!text || !text.trim()) && !imageBase64 && !audioBase64) {
      return res
        .status(400)
        .json({ message: "Message text, image, or audio is required" });
    }

    if (!receiver_id) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    // Check if receiver exists
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Can't send message to yourself
    if (userId === receiver_id) {
      return res.status(400).json({ message: "Cannot send message to yourself" });
    }

    let message = await Message.create({
      text: text?.trim() || "",
      imageBase64: imageBase64 || null,
      audioBase64: audioBase64 || null,
      owner_id: userId,
      type: "private",
      receiver_id: receiver_id,
    });

    // Populate sender and receiver details for the response
    message = await message.populate([
      { path: "owner_id", select: "name age email avatar" },
      { path: "receiver_id", select: "name age email avatar" }
    ]);

    /**
     * 🔔 Real-time notification via Socket.IO
     * Emit to both sender and receiver rooms for instant updates.
     * This ensures:
     * 1. Receiver sees the message immediately
     * 2. Sender's other devices (if any) also get updated
     */
    const io = getIO();
    
    // Convert to plain object for consistent serialization
    const messageData = message.toObject();
    
    console.log(`📤 Emitting private:new-message to users: ${userId} and ${receiver_id}`);
    console.log(`📝 Message data:`, {
      _id: messageData._id,
      senderId: messageData.owner_id._id,
      receiverId: messageData.receiver_id._id,
      text: messageData.text?.substring(0, 20) + '...'
    });
    
    // Emit to receiver's room
    io.to(`user:${receiver_id}`).emit("private:new-message", messageData);
    // Also emit to sender's room (for multi-device support)
    io.to(`user:${userId}`).emit("private:new-message", messageData);

    return res.status(201).json(message);
  } catch (err) {
    console.error("sendPrivateMessage error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// @desc  Get private messages between current user and another user
// @route GET /api/messages/private/:userId
// @access Private
exports.getPrivateMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find all private messages between current user and the specified user
    const messages = await Message.find({
      type: "private",
      $or: [
        { owner_id: currentUserId, receiver_id: userId },
        { owner_id: userId, receiver_id: currentUserId }
      ]
    })
      .populate("owner_id", "name age email avatar")
      .populate("receiver_id", "name age email avatar")
      .sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (err) {
    console.error("getPrivateMessages error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// @desc  Get all users that current user has private conversations with
// @route GET /api/messages/private/conversations
// @access Private
exports.getPrivateConversations = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Find all private messages where current user is sender or receiver
    const messages = await Message.find({
      type: "private",
      $or: [
        { owner_id: currentUserId },
        { receiver_id: currentUserId }
      ]
    })
      .populate("owner_id", "name age email avatar")
      .populate("receiver_id", "name age email avatar")
      .sort({ createdAt: -1 });

    // Extract unique conversation partners with their latest message
    const conversationsMap = new Map();
    
    messages.forEach(message => {
      const partnerId = message.owner_id._id.toString() === currentUserId 
        ? message.receiver_id._id.toString() 
        : message.owner_id._id.toString();
      
      const partner = message.owner_id._id.toString() === currentUserId 
        ? message.receiver_id 
        : message.owner_id;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          user: partner,
          lastMessage: message,
          lastMessageTime: message.createdAt
        });
      }
    });

    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    return res.status(200).json(conversations);
  } catch (err) {
    console.error("getPrivateConversations error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
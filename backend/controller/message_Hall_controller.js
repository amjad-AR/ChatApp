// controller/message_Hall_controller.js
const Message = require("../model/message_model");
const { getIO } = require("../socket");

// @desc  Get all messages in Hall
// @route GET /api/messages/hall
// @access Private
exports.getAllMessagesInHall = async (req, res) => {
  try {
    const messages = await Message.find({ type: "public" })
      .populate("owner_id", "name age email avatar")
      .sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (err) {
    console.error("getAllMessagesInHall error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// @desc  Add new message to Hall (text or image)
// @route POST /api/messages/hall
// @access Private
exports.addMessageToHall = async (req, res) => {
  try {
    const { text, imageBase64, audioBase64 } = req.body;

    // ✅ At least text OR image OR audio is required
    if ((!text || !text.trim()) && !imageBase64 && !audioBase64) {
      return res
        .status(400)
        .json({ message: "Message text, image, or audio is required" });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    let message = await Message.create({
      text: text?.trim() || "",
      imageBase64: imageBase64 || null,
      audioBase64: audioBase64 || null,
      owner_id: userId,
      type: "public",
    });

    message = await message.populate("owner_id", "name age email avatar");

    // 🔥 Emit to all connected clients
    const io = getIO();
    io.emit("hall:new-message", message);

    return res.status(201).json(message);
  } catch (err) {
    console.error("addMessageToHall error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// @desc  Delete a message from Hall
// @route DELETE /api/messages/hall/:id
// @access Private
exports.deleteMessageFromHall = async (req, res) => {
  try {
    const messageId = req.params.id;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.user.id;

    // Check if message exists
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only the owner can delete their message
    if (message.owner_id.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    await message.deleteOne();

    // 🔥 Notify all clients about the deletion
    const io = getIO();
    io.emit("hall:delete-message", { messageId });

    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("deleteMessageFromHall error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
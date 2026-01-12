// routes/messages_routes.js
const express = require("express");
const {
  addMessageToHall,
  getAllMessagesInHall,
  deleteMessageFromHall,
} = require("../controller/message_Hall_controller");
const {
  sendPrivateMessage,
  getPrivateMessages,
  getPrivateConversations,
} = require("../controller/private_message_controller");
const { protect } = require("../middlewares/middlewares");

const messageRoute = express.Router();

// Base path from server.js: /messages
// → Final endpoints:
//    GET  /messages/hall
//    POST /messages/hall
messageRoute
  .route("/hall")
  .get(protect, getAllMessagesInHall)
  .post(protect, addMessageToHall);
messageRoute.delete("/hall/:id", protect, deleteMessageFromHall);

// Private message endpoints:
//    POST /messages/private - Send private message
//    GET  /messages/private/conversations - Get all conversations
//    GET  /messages/private/:userId - Get messages with specific user
//!  Get messages with specific user
messageRoute.route("/private").post(protect, sendPrivateMessage);
//! Get all users that current user has private conversations with
messageRoute
  .route("/private/conversations")
  .get(protect, getPrivateConversations);
//! Get private messages between current user and another user
messageRoute.route("/private/:userId").get(protect, getPrivateMessages);

module.exports = messageRoute;

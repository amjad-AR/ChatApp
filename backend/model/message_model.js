// backend/model/message_model.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      trim: true,        // not required anymore
    },
    imageBase64: {
      type: String,      // 👈 new: for image messages
    },
    audioBase64: {
      type: String,      // 👈 new: for audio/voice messages
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      required: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        return this.type === "private";
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema, "message");

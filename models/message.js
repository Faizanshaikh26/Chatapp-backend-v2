const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const userMessageSchema = new Schema(
  {
    content: String,

    attachments: [
      {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],

    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: true,
    },
  },

  {
    timestamps: true,
  }
);

const Message = mongoose.model("message", userMessageSchema);

module.exports = Message;

const mongoose = require("mongoose");
const { Schema,Types } = mongoose;


const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    groupChat: {
      type: Boolean,
      default:false,
    },
    creator: {
      type: Types.ObjectId,
      ref: "User",
    },
    members: [{
      type: Types.ObjectId,
      ref: "User",
    }],
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;


const mongoose= require('mongoose');
const { Schema } = require("mongoose");

const userSchema = new Schema(
    {
      name: {
        type: String,
        required: true,
      },
      bio: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
       
      },
      username: {
        type: String,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
      avatar: {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    },
    {
      timestamps: true,
    }
  );



  const User = mongoose.model("User", userSchema);

module.exports = User;
const Users = require("../models/user");
const bcrypt = require("bcryptjs");
const { cookieOptions } = require("../constant/cookioption");
const User = require("../models/user");
const Chat = require("../models/chat");
const Request = require("../models/request");
const {
  emitEvent,
  uploadFilesToCloudinary,

} = require("../utils/features");
const { NEW_REQUEST, REFETCH_CHATS } = require("../constant/events");
const { getOtherMember } = require("../lib/helper");
const jwt = require("jsonwebtoken");

exports.signUp = async (req, res) => {
  try {
    let verifiedUser = await Users.findOne({ email: req.body.email });
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "Please upload an avatar" });
    }

    const result = await uploadFilesToCloudinary([file]);
    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };

    if (verifiedUser) {
      return res.status(400).json({
        success: false,
        error: "Existing user found with the same email address",
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const user = new Users({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      bio: req.body.bio,
      name: req.body.name,
      avatar,
    });

    await user.save();

    const data = { user: { id: user.id } };
    const token = jwt.sign(data, process.env.JWT_SECRET || "Secret-key");

    // Set the token as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    });

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    let user = await Users.findOne({ email: req.body.email });

    if (!user) {
      return res.status(400).json({ success: false, error: "User not found" });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Password" });
    }

    const data = { user: { id: user.id } };
    const token = jwt.sign(data, process.env.JWT_SECRET || "Secret-key");

    // Set the token as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    });

    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Get user profile
exports.getMyProfile = async (req, res) => {
  try {
    const user = await Users.findById(req.user);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// User logout
// exports.logout = async (req, res) => {
//   try {
//     console.log("Logout request received");
//     return res
//       .status(200)
//       .cookie("token", "", { ...cookieOptions, maxAge: 0 }) // Ensuring cookie deletion
//       .json({
//         success: true,
//         message: "User logged out successfully",
//       });
//   } catch (error) {
//     console.error("Logout error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };
exports.logout = async (req, res) => {
  return res
    .status(200)
    .cookie("token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
};
// User search
// exports.searchUser = async (req, res) => {
//   const { name = "" } = req.query;

//   const myChats = await Chat.find({ groupChat: false, members: req.user });

//   const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

//   const allUsersExceptMeAndFriends = await User.find({
//     _id: { $nin: allUsersFromMyChats },
//     name: { $regex: name, $options: "i" },
//   });

//   const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
//     _id,
//     name,
//     avatar: avatar.url,
//   }));

//   return res.status(200).json({
//     success: true,
//     message: users,
//   });
// };

exports.sendFriendRequest = async (req, res) => {
  const { receiverId } = req.body;

  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: receiverId },
      { sender: receiverId, receiver: req.user },
    ],
  });

  if (request)
    return res
      .status(400)
      .json({ success: false, message: "Request already Sent" });
  await Request.create({
    sender: req.user,
    receiver: receiverId,
  });
  emitEvent(req, NEW_REQUEST, [receiverId]);

  return res
    .status(200)

    .json({
      success: true,
      message: "Friend Request Sent",
    });
};

exports.acceptFriendRequest = async (req, res) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request)
    return res
      .status(404)
      .json({ success: false, message: "Request Not Found" });

  if (request.receiver._id.toString() !== req.user.toString())
    return res
      .status(404)
      .json({
        success: false,
        message: "You are not authorized to accept this request",
      });

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];
  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);
  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id, // Corrected this line
  });
};

exports.getMyNotifications = async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequests = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequests,
  });
};

exports.getMyFriends = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const chats = await Chat.find({
      members: req.user,
      groupChat: false,
    }).populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
      const otherUser = getOtherMember(members, req.user);
      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    });

    if (chatId) {
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      const availableFriends = friends.filter(
        (friend) =>
          !chat.members.some(
            (member) => member.toString() === friend._id.toString()
          )
      );

      return res.status(200).json({
        success: true,
        friends: availableFriends,
      });
    } else {
      return res.status(200).json({
        success: true,
        friends,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


 exports.searchUser = async (req, res) => {
  const { name = "" } = req.query;

  // Finding All my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user });

  //  extracting All Users from my chats means friends or people I have chatted with
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  // Finding all users except me and my friends
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  // Modifying the response
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
};


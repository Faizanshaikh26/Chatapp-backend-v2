const User = require("../models/user");
const Chat = require("../models/chat");
const Message = require("../models/message");
const jwt=require("jsonwebtoken")
const cookieOptions=require('../constant/cookioption')


const adminLogin = async (req, res) => {
  const { secretKey } = req.body;

  const adminSecretKey = process.env.ADMIN_SECRET_KEY;
  const isMatch = secretKey === adminSecretKey || secretKey === "INDIA";

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid Secret Key",
    });
  }

  const token = jwt.sign({ secretKey }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });

  // Set the token in a cookie
  res.cookie("admintoken", token, { ...cookieOptions, maxAge: 1000 * 60 * 15 });

  return res.status(200).json({
    success: true,
    message: "Admin Login Successful",
  });
};

const adminData=async (req, res) => {
  return res.status(200).json({
   admin:true
  })
}
const adminlogout = async (req, res) => {
  return res
    .status(200)
    .cookie("admintoken", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Admin logged out successfully",
    });
};



const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    const transformedUsers = await Promise.all(
      users.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          Chat.countDocuments({ groupChat: true, members: _id }),
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);

        return {
          name,
          username,
          avatar: avatar.url,
          _id,
          groups,
          friends,
        };
      })
    );

    return res.status(200).json({
      success: true,
      users: transformedUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");

    const transformedChat = await Promise.all(
      chats.map(async ({ members, _id, groupChat, name, creator }) => {
        const totalMessages = await Message.countDocuments({ chat: _id });

        return {
          _id,
          groupChat,
          name,
          avatar: members.slice(0, 3).map((member) => member.avatar?.url || ""),
          members: members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            avatar: avatar?.url || "",
          })),
          creator: {
            name: creator?.name || "None",
            avatar: creator?.avatar?.url || "",
          },
          totalMembers: members.length,
          totalMessages,
        };
      })
    );

    return res.status(200).json({
      success: true,
      chats: transformedChat,
    });
  } catch (error) {
    console.error("Error in getAllChats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllMessages = async (req, res) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachment, _id, sender, createdAt, chat }) => ({
      _id,
      attachment,
      content,
      createdAt,
      chat: chat?._id,
      groupChat: chat?.groupChat,
      sender: {
        _id: sender?._id,
        name: sender?.name,
        avatar: sender?.avatar.url,
      },
    })
  );

  return res.status(200).json({
    success: true,
    message: transformedMessages,
  });
};

const getDashBoardStats = async (req, res) => {
  try {
    const [groupCount, userCount, messagesCount, totalChatsCount] = await Promise.all([
      Chat.countDocuments({ groupChat: true }),
      User.countDocuments(),
      Message.countDocuments(),
      Chat.countDocuments(),
    ]);

    const today = new Date();
    const lastSevenDays = new Date();
    lastSevenDays.setDate(lastSevenDays.getDate() - 7);

    const lastSevenDaysMessages = await Message.find({
      createdAt: {
        $gte: lastSevenDays,
        $lte: today,
      },
    }).select("createdAt");

    const messages = new Array(7).fill(0);

    lastSevenDaysMessages.forEach((message) => {
      const createdAtDate = new Date(message.createdAt);
      const daysDifference = Math.floor((today - createdAtDate) / (1000 * 60 * 60 * 24));
      const index = 6 - daysDifference;

      if (index >= 0 && index < 7) {
        messages[index]++;
      }
    });

    const stats = {
      groupCount,
      userCount,
      messagesCount,
      totalChatsCount,
      messagesChart: messages,
    };

    return res.status(200).json({
      success: true,
      message: stats,
    });
  } catch (error) {
    console.error("Error in getDashBoardStats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};




module.exports = {
  adminLogin,
  adminlogout,
  adminData,
  getAllUsers,
  getAllChats,
  getAllMessages,
  getDashBoardStats,
 
};

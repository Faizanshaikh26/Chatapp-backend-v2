const {
  ALERT,
  REFETCH_CHATS,
  NEW_ATTACHMENT,
  NEW_MESSAGE_ALERT,
  NEW_MESSAGE,
} = require("../constant/events");
const { getOtherMember } = require("../lib/helper");
const Chat = require("../models/chat");
const { emitEvent, deleteFilesFromCloudinary, uploadFilesToCloudinary } = require("../utils/features");
const User = require("../models/user");
const Message = require("../models/message");
const { default: mongoose } = require("mongoose");

exports.newGroupChat = async (req, res) => {
  const { name, members } = req.body;
  const allmembers = [...members, req.user];
  await Chat.create({
    name,
    groupChat: true,
    creator: req.user,
    members: allmembers,
  });

  emitEvent(req, ALERT, allmembers, `Welcom to ${name} Group`);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).send({
    success: true,
    message: "Group  created successfully",
  });
};

exports.getMyChat = async (req, res) => {
  try {
    const userId = req.user;

    const chats = await Chat.find({ members: userId }).populate(
      "members",
      "name avatar"
    );

    const transformChat = chats.map(({ _id, name, members, groupChat }) => {
      const otherMember = getOtherMember(members, userId);

      return {
        _id,
        groupChat,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
        name: groupChat ? name : otherMember.name,
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== userId.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
      };
    });

    return res.status(200).json({
      success: true,
      chats: transformChat,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getMyGroups = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: req.user,
      creator: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupChat, name }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url), // Extract avatar URLs
    }));

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving groups",
      error: error.message,
    });
  }
};

exports.addMembers = async (req, res) => {
  const { chatId, members } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  }

  if (!chat.groupChat) {
    return res.status(404).json({
      success: false,
      message: "This is not a group chat",
    });
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to add members",
    });
  }

  const allNewMembersPromise = members.map((member) =>
    User.findById(member, "name")
  );

  const allNewMembers = await Promise.all(allNewMembersPromise);

  const uniqueMembers = allNewMembers
    .filter((member) => !chat.members.includes(member._id.toString()))
    .map((member) => member._id);

  chat.members.push(...uniqueMembers);

  if (chat.members.length > 100) {
    return res.status(400).json({
      success: false,
      message: "You can't add more than 100 members",
    });
  }

  await chat.save();

  const allUsersName = allNewMembers.map((user) => user.name).join(", ");
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allUsersName} has been added in the group`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Member added successfully",
  });
};

exports.removeMember = async (req, res) => {
  const { chatId, userId } = req.body;

  const [chat, userTobeRemoved] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  }

  if (!chat.groupChat) {
    return res.status(404).json({
      success: false,
      message: "This is not a group chat",
    });
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to add members",
    });
  }

  if (chat.members.length <= 3)
    return res.status(400).json({
      success: false,
      message: "Group must have at least 3 members",
    });
const allChatmembers=chat.members.map(member =>member.toString());
  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await chat.save();

  emitEvent(
    req,
    ALERT,
    chat.members,
   {
    message: `${userTobeRemoved.name} has been removed from the group`,
    chatId
   }
  );

  emitEvent(req, REFETCH_CHATS, allChatmembers);
  return res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
};

exports.leaveGroup = async (req, res) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  }

  if (!chat.groupChat)
    return res
      .status(404)
      .json({ success: false, message: "This is not a group chat" });

  chat.members = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );
  await chat.save();
  if (chat.members.length <= 3)
    return res.status(400).json({
      success: false,
      message: "Group must have at least 3 members",
    });

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (remainingMembers.length < 2)
    return res.status(400).json({
      success: false,
      message: "Group must have at least 3 members",
    });

  if (chat.creator.toString() == req.user.toString()) {
    const randomElem = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElem];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([
    User.findById(req.user, "name"),

    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {message:` User ${user.name} has left  the group`,chatId});

  emitEvent(req, REFETCH_CHATS, chat.members);
  return res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
};

exports.sendAttachment = async (req, res) => {
  const { chatId } = req.body;
  const files = req.files || [];


  if (files.length < 1)
    return res.status(404).json({
      success: false,
      message: "You must add at least one file",
    });
    
if(files.length>5) return res.status(400).json({success:"false",message: "Files Can't be more than 5"})

  const [chat, me] = await Promise.all(
    [Chat.findById(chatId)],
    User.findById(req.user, "name")
  );

  if (!chat)
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  


    

  const attachments = await uploadFilesToCloudinary(files);

  const messageForDB = {
    content: "",
    attachments,
    sender: req.user,
    chat: chatId,
  };
  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: req.user,
      name: req.user.name,
      // avatar: me.avatar.url,
    },
  };

  const message = Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGE, chat.members, {
    message: messageForRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });
  return res.status(200).json({
    success: true,
    message,
  });
};



exports.getChatDetails = async (req, res) => {
  try {
    const chatId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat ID",
      });
    }

    let chat;
    if (req.query.populate === "true") {
      chat = await Chat.findById(chatId)
        .populate("members", "name avatar")
        .lean()
        .exec();
      
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));
    } else {
      chat = await Chat.findById(chatId).exec();
      
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }
    }

    return res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


exports.renameGroup = async (req, res) => {
  const chatId = req.params.id;
  const { name } = req.body; // Correctly extract the name from the body

  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (!chat.groupChat) {
      return res.status(400).json({
        success: false,
        message: "This is not a group chat",
      });
    }

    if (chat.creator.toString() !== req.user.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to rename this group",
      });
    }

    chat.name = name;
    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
      success: true,
      message: "Group renamed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred while renaming the group",
      error: error.message,
    });
  }
};

exports.deleteChat = async (req, res) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);

  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  }

  const member = chat.members;

  if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to delete this group",
    });
  }

  if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to delete this chat",
    });
  }

  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: {
      $exists: true,
      $ne: [],
    },
  });

  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) => {
    attachments.forEach((public_id) => {
      public_ids.push(public_id);
    });
  });

  await Promise.all([
    deleteFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ])

    .then(() => {
      emitEvent(req, REFETCH_CHATS, member);
      return res.status(200).json({
        success: true,
        message: "Chat deleted successfully",
      });
    })
    .catch((error) => {
      return res.status(500).json({
        success: false,
        message: "An error occurred while deleting the chat",
        error: error.message,
      });
    });
};

exports.getMessages = async (req, res) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;
  const limit = 20;
  const skip = (page - 1) * limit;

  const chat = await Chat.findById(chatId)

  if(!chat) return res.status(404).json({success:false, message: "Chat not found"})
if(!chat.members.includes(req.user.toString())) return res.status(404).json({success:false, message:"You are not allowed to acess  "}) 
  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name ")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / limit);

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages
  });
};

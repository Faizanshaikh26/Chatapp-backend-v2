const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { Server } = require("socket.io");
const { createServer } = require("http");
const { v4: uuidv4 } = require("uuid");
const { v2: cloudinary } = require("cloudinary");
const dotenv = require("dotenv");
const userRoute = require("./routes/user");
const chatRoute = require("./routes/chat");
const adminRoute = require("./routes/admin");
const {
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  START_TYPING_CHAT,
  STOP_TYPING_CHAT,
  CHAT_JOINED,
  CHAT_LEAVED,
  ONLINE_USERS,
} = require("./constant/events");
const Message = require("./models/message");
const { socketAuthenticator } = require("./middlewares/Auth");
const { corsOptions } = require("./constant/config");
const port = process.env.PORT || 9000;


dotenv.config({ path: "./.env" });

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});
app.set("io", io);

const userSocketId = new Map();
const onlineUsers = new Set();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("Successfully connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
};

connectDB();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.get("/", (req, res) => {
  res.send("Welcome To ChatUp");
});

const getSockets = (users = []) => {
  if (!userSocketId || typeof userSocketId.get !== "function") {
    console.error("userSocketId is not properly initialized.");
    return [];
  }

  const sockets = users.map((user) => userSocketId.get(user.toString()));
  const validSockets = sockets.filter((socket) => socket !== undefined);

  console.log("Returning sockets:", validSockets);
  return validSockets;
};

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res || {}, async (err) => {
    await socketAuthenticator(err, socket, next);
  });
});

io.on("connection", (socket) => {
  const user = socket.user;

  userSocketId.set(user._id.toString(), socket.id);
  onlineUsers.add(user._id.toString());
  io.emit(ONLINE_USERS, Array.from(onlineUsers));
  console.log("A user connected", socket.id);

  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    const messageForRealTime = {
      content: message,
      _id: uuidv4(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDb = {
      content: message,
      sender: user._id,
      sender: user._id,
      chat: chatId,
    };
    console.log("Emitting message", messageForRealTime);
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(NEW_MESSAGE, {
      message: messageForRealTime,
      chatId,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, {
      chatId,
    });

    try {
      await Message.create(messageForDb);
    } catch (error) {
      console.log(error);
    }
    console.log("New message", messageForRealTime);
  });

  socket.on(START_TYPING_CHAT, ({ members, chatId }) => {
    console.log("Start typing", chatId);

    const membersSocket = getSockets(members);
    socket.to(membersSocket).emit(START_TYPING_CHAT, { chatId });
  });

  socket.on(STOP_TYPING_CHAT, ({ members, chatId }) => {
    console.log("Stop typing", chatId);

    const membersSocket = getSockets(members);
    socket.to(membersSocket).emit(STOP_TYPING_CHAT, { chatId });
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId?.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId?.toString());
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    userSocketId.delete(user._id?.toString());
    onlineUsers.delete(user._id?.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = { userSocketId };

const { userSocketId } = require("../app");

exports.getOtherMember = (members, userId) => {
  if (!userId) {
    throw new Error("User ID is undefined");
  }

  return members.find((member) => member._id.toString() !== userId.toString());
};

exports.getSockets = (users = []) => {
  // Assuming userSocketId is initialized somewhere before this function is called
  if (!userSocketId || typeof userSocketId.get !== "function") {
    console.error("userSocketId is not properly initialized.");
    return [];
  }

  const sockets = users.map((user) => userSocketId.get(user.toString()));

  return sockets;
};

// let userSocketId = new Map(); // Initialize userSocketId as needed

// exports.getSockets = (users = []) => {
//   // Check if userSocketId is properly initialized and has a get function
//   if (!userSocketId || typeof userSocketId.get !== 'function') {
//     console.error('userSocketId is not properly initialized.');
//     return [];
//   }

//   // Map user IDs to socket IDs using userSocketId Map
//   const sockets = users.map((user) => userSocketId.get(user.toString()));

//   return sockets;
// };

exports.getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

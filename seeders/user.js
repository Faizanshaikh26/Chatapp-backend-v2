const Chat = require("../models/chat");
const Message = require("../models/message");
const User = require("../models/user");
const { faker, simpleFaker } = require("@faker-js/faker");

exports.createUser = async (numUsers) => {
  try {
    const usersPromise = [];

    for (let i = 0; i < numUsers; i++) {
      const tempuser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        email: faker.internet.email(), 
        bio: faker.lorem.sentence(10),
        password: "password",
        avatar: {
          url: faker.image.avatar(),
          public_id: faker.system.fileName(),
        },
      });
      usersPromise.push(tempuser);
    }

    await Promise.all(usersPromise);
    console.log(`Created ${usersPromise.length} users`);
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};



exports.createSampleChats = async (chatsCount) => {
  try {
    const users = await User.find().select('_id');
    const chatPromises = [];

    let chatsCreated = 0;

    for (let i = 0; i < users.length && chatsCreated < chatsCount; i++) {
      for (let j = 0; j < users.length && chatsCreated < chatsCount; j++) {
        if (i !== j) {
          chatPromises.push(
            Chat.create({
              name: faker.lorem.words(2),
              members: [users[i]._id, users[j]._id]
            })
          );
          chatsCreated++;
        }
      }
    }

    await Promise.all(chatPromises);
    console.log(`${chatsCreated} chats created`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};




exports.createGroupChats = async (numChats) => {
  try {
    const users = await User.find().select('_id'); // Corrected to '_id'

    const chatPromises = []; // Renamed to chatPromises

    for (let i = 0; i < numChats; i++) {
      const numMembers = simpleFaker.number.int({ min: 3, max: users.length });

      const members = [];

      for (let j = 0; j < numMembers; j++) { // Changed loop variable to j
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex]._id; // Access _id property

        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }

      const chat = Chat.create({
        groupChat: true,
        name: faker.lorem.words(1),
        members,
        creator: members[0]
      });

      chatPromises.push(chat);
    }

    await Promise.all(chatPromises); // Corrected usage of Promise.all
    console.log("Chats created");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

exports.createMessageInChat = async (chatId, numMessages) => {
  try {
    const users = await User.find().select('_id');
    const chat = await Chat.findById(chatId); // Ensure the specific chat is fetched

    if (!chat) {
      console.error('Chat not found');
      process.exit(1);
    }

    const messagePromises = []; // Renamed to messagePromises

    for (let i = 0; i < numMessages; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]._id; // Access _id property

      messagePromises.push(
        Message.create({
          chat: chatId,
          sender: randomUser,
          content: faker.lorem.sentence()
        })
      );
    }

    await Promise.all(messagePromises); // Corrected usage of Promise.all
    console.log('Messages created');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

exports.createMessage = async (numMessages) => {
  try {
    const users = await User.find().select('_id');
    const chats = await Chat.find().select('_id');

    const messagePromises = []; // Renamed to messagePromises

    for (let i = 0; i < numMessages; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]._id; // Access _id property
      const randomChat = chats[Math.floor(Math.random() * chats.length)]._id; // Access _id property

      messagePromises.push(
        Message.create({
          chat: randomChat,
          sender: randomUser,
          content: faker.lorem.sentence()
        })
      );
    }

    await Promise.all(messagePromises); // Corrected usage of Promise.all
    console.log('Messages created');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};


const express = require("express");

const { isAuthenticated } = require("../middlewares/Auth");
const {
  newGroupChat,
  getMyChat,
  getMyGroups,
  addMembers,
  removeMember,
  leaveGroup,
  sendAttachment,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
} = require("../controllers/chat");
const { attachmentsMulter } = require("../middlewares/multer");
const {
  newGroupValidator,
  validateHandler,
  addMemberValidator,
  removeMemberValidator,

  sendAttachmentValidator,
  chatIdValidator,
  renameValidator,
} = require("../lib/validators");
const router = express.Router();

router.use(isAuthenticated);

router.post("/new", newGroupValidator(), validateHandler, newGroupChat);
router.post(
  "/message",
  attachmentsMulter,
  sendAttachmentValidator(),
  validateHandler,
  sendAttachment
);

router.get("/my", getMyChat);
router.get("/my/groups", getMyGroups);
router.get("/message/:id", chatIdValidator(), validateHandler, getMessages);

router.put("/addmembers", addMemberValidator(), validateHandler, addMembers);
router.put(
  "/removemember",
  removeMemberValidator(),
  validateHandler,
  removeMember
);

router.delete("/leave/:id", chatIdValidator(), validateHandler, leaveGroup);

router
  .route("/:id")
  .get(chatIdValidator(), validateHandler, getChatDetails)
  .put(renameValidator(),validateHandler, renameGroup)
  .delete(chatIdValidator(), validateHandler,deleteChat);

module.exports = router;

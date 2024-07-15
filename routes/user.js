const express = require("express");
const {
  signUp,
  login,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getMyNotifications,
  getMyFriends,
} = require("../controllers/user");
const { isAuthenticated } = require("../middlewares/Auth");
const { singleAvatar } = require("../middlewares/multer");
const { validateHandler, loginValidator, signUpValidator, sendRequestValidator, acceptRequestValidator } = require("../lib/validators");
const router = express.Router();

router.post("/signup", singleAvatar, signUpValidator(), validateHandler, signUp);
router.post("/login", loginValidator(),validateHandler ,login);

router.use(isAuthenticated);

router.get("/me", getMyProfile);
router.get("/logout", logout);
router.get("/search", searchUser);
 

router.put("/sendrequest", sendRequestValidator(),validateHandler, sendFriendRequest);

router.put("/acceptrequest", acceptRequestValidator(),validateHandler, acceptFriendRequest);


router.get("/notifications",getMyNotifications);
router.get("/friends",getMyFriends);


module.exports = router;

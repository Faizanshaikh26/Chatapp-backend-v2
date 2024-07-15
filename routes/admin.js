const express = require("express");
const { getAllUsers, getAllChats, getAllMessages, getDashBoardStats, adminLogin, adminlogout, adminData } = require("../controllers/admin");
const { adminLoginValidator, validateHandler } = require("../lib/validators");
const { isadmin } = require("../middlewares/Auth");
const router = express.Router();


router.post('/verify' ,adminLoginValidator(),validateHandler,adminLogin)
router.get('/logout',adminlogout)



router.use(isadmin)

router.get('/',adminData)
router.get('/users',getAllUsers)
router.get('/chats',getAllChats)
router.get('/messages',getAllMessages)
router.get('/stats',getDashBoardStats)


module.exports = router;





const { body, validationResult ,check, param,query} = require("express-validator");

exports.validateHandler = (req, res, next) => {
  const errors = validationResult(req);

  const errorsmsg = errors
    .array()
    .map((err) => err.msg)
    .join(",");
  console.log(errorsmsg);

  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: errorsmsg,
  });
};

exports.signUpValidator = () => [
  body("name", "please enter your name").notEmpty(),
  body("email", "please enter your email").notEmpty(),
  body("password", "please enter your password").notEmpty(),
  body("bio", "please enter your bio").notEmpty(),
  body("username", "please enter your username").notEmpty(),
  body("email", "Please use Valid Email").isEmail(),
  // check("avatar", "Please Upload your Avatar").notEmpty()
];
exports.loginValidator = () => [
  body("email", "please enter your email").notEmpty(),
  body("password", "please enter your password").notEmpty(),

  body("email", "Please use Valid Email").isEmail(),
];

exports.newGroupValidator = () => [
  body("name", "please enter name").notEmpty(),
  body("members").notEmpty().withMessage("please enter Members").isArray({min:2,max:100}).withMessage("Members must be between 2-10 "),

 ];

 exports.addMemberValidator = () => [
  body("chatId", "please enter the Chat Id").notEmpty(),
  body("members").notEmpty().withMessage("please enter Members").isArray({min:1,max:97}).withMessage("Members must be between 1-97 "),

 ];

 exports.removeMemberValidator = () => [
  body("chatId", "please enter the Chat Id").notEmpty(),
  body("userId", "please enter the User Id").notEmpty(),

 ];

 exports.sendAttachmentValidator = () => [
  body("chatId", "please enter the Chat Id").notEmpty(),
  // check("files").notEmpty().withMessage("Please Upload your Attachments")
  // .isArray({min:1,max:5}).withMessage("Attachments must be between 1-5 "),

 ];

 exports.chatIdValidator = () => [
  param("id", "please enter the Chat Id").notEmpty(),

 ];
 
 exports.renameValidator = () => [
  param("id", "please enter the Chat Id").notEmpty(),
  body("name", "please enter New group name").notEmpty(),
 ]

 exports.sendRequestValidator = () => [

  body("receiverId", "please enter user Id").notEmpty(),
 ]

 exports.acceptRequestValidator = () => [

  body("requestId", "please enter user Id").notEmpty(),
  body("accept").notEmpty().withMessage("please Add Accept").isBoolean().withMessage("Accept Must be a boolean"),
 ]
 

 exports.adminLoginValidator = () => [

  body("secretKey", "please enter Secret Key").notEmpty(),
 ]

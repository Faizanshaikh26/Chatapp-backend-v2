const multer = require("multer");

const multerUpload = multer({
  limits: {
    fileSize: 1024 * 1024 * 20,
  },
});

exports.singleAvatar = multerUpload.single("avatar");
exports.attachmentsMulter = multerUpload.array("files",5);

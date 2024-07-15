const { v2: cloudinary } = require("cloudinary");
const { v4: uuid } = require("uuid");
const { getBase64, getSockets } = require("../lib/helper");

exports.emitEvent = async (req, event, users, data) => {
  let io = req.app.get("io");
  const userSockets = getSockets(users);
  io.to(userSockets).emit(event, data);
};

exports.uploadFilesToCloudinary = async (files = []) => {
  const uploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
  });

  try {
    const result = await Promise.all(uploadPromises);
    return result.map((result) => ({
      public_id: result.public_id,
      url: result.secure_url,
    }));
  } catch (error) {
    throw new Error(`Error while uploading: ${error.message}`);
  }
};

exports.deleteFilesFromCloudinary = async (public_ids) => {
  console.log("deleted");
};

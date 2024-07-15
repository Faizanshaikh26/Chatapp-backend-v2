const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.isAuthenticated = async (req, res, next) => {
  try {
    if (!req.cookies) {
      return res.status(401).json({ success: false, message: 'Please login to access' });
    }

    const token = req.cookies["token"];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Please login to access' });
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET || 'Secret-key');
    if (!decodedData || !decodedData.user || !decodedData.user.id) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = decodedData.user.id;
    next();
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};



exports.isadmin = async (req, res, next) => {
  try {
    if (!req.cookies) {
      return res.status(401).json({ success: false, message: 'Please login to access' });
    }

    const token = req.cookies["admintoken"];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Only Admin can access this route' });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const adminSecretKey = process.env.ADMIN_SECRET_KEY;
    const isMatch = decodedToken.secretKey === adminSecretKey || decodedToken.secretKey === "INDIA";

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Only Admin can access this route' });
    }

    next();
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.socketAuthenticator = async (err, socket, next) => {
  try {
    if (err) return next(err);

    const authToken = socket.request.cookies['token'];

    if (!authToken) {
      const error = new Error("Please login to access this route");
      error.status = 401;  // Attach status code to error object
      return next(error);
    }

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData.user.id);

    if (!user) {
      const error = new Error("Please login to access this route");
      error.status = 401;  // Attach status code to error object
      return next(error);
    }

    socket.user = user;

    return next();
  } catch (error) {
    console.log(error);
    const authError = new Error("Please login to access this route");
    authError.status = 401;  // Attach status code to error object
    return next(authError);
  }
};
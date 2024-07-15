const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { v2: cloudinary } = require("cloudinary");
const dotenv = require("dotenv");
const userRoute = require("./routes/user");
const chatRoute = require("./routes/chat");
const adminRoute = require("./routes/admin");

const { corsOptions } = require("./constant/config.js");
const connectDB = require("./db/connection.js");

const port = process.env.PORT || 3000;

dotenv.config({ path: "./.env" });

const app = express();

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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



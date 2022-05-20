const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// all the http requests wil be here 
app.get("/" , (req, res) => {
    res.send({message:"you may want to click here to sign in with google (idk why you will do this)"})
})

app.listen(port, () => {
  console.log("node server is started");
});

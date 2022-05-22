const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://admin:${process.env.PASSWORD}@database.mp0iy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    await client.connect();
    console.log("connected with mongodb");
    const userCollection = client.db("users").collection("user");
    // this can handle any kind of login
    app.post("/user/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email };
      const found = await userCollection.findOne(query);
      let user = {};
      if (found) {
        user = { email: found.email, role: found.role };
      } else {
        user = {
          email: email,
          role: "user",
        };
        const result = await userCollection.insertOne(user);
      }
      const token = jwt.sign(user, process.env.JWT_KEY, {
        expiresIn: "1d",
      });
      res.send({ token: token });
    });
  } finally {
  }
};
run().catch(console.log);
// all the http requests wil be here
app.get("/", (req, res) => {
  res.send({
    message:
      "you may want to click here to sign in with google (idk why you will do this)",
  });
});

app.listen(port, () => {
  console.log("node server is started");
});

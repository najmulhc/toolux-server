const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, Admin, ObjectId } = require("mongodb");
const { ObjectID } = require("bson");
const uri = `mongodb+srv://admin:${process.env.PASSWORD}@database.mp0iy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const varifyJWT = (req, res, next) => {
  const key = req.headers.authentication.split(" ")[1];
  if (!key) {
    return res.send({ error: "unauthorised access" });
  }
  const token = jwt.decode(key);
  req.token = token;
  next();
};

const run = async () => {
  try {
    await client.connect();
    console.log("connected with mongodb");
    const userCollection = client.db("users").collection("user");
    const productCollection = client.db("products").collection("product");

    // for product
    app.get("/product", async (req, res) => {
      const query = {};
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/product/:id", async (req, res) => { 
      const { id } = req.params; 
      const query = { _id: ObjectId(id) }
      const result = await productCollection.findOne(query)
      res.send(result)
    })
    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });
    app.delete("/product/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    //for users
    // find all users
    app.get("/users", varifyJWT, async (req, res) => {
      if (req.token.role === "admin") {
        const users = await userCollection.find().toArray();
        res.send({ users: users });
      } else {
        res.send({ error: "unauthorised acces" });
      }
    });
    // validation of admin
    app.get("/user/admin/:email", varifyJWT, async (req, res) => {
      const { email } = req.params;
      const decodedEmail = req.token.email;
      if (email === decodedEmail) {
        const query = { email };
        const result = await userCollection.findOne(query);
        res.send(result);
      } else {
        res.send({ error: "forbidden" });
      }
    });
    // to make a user admin
    app.put("/user/admin/:email", async (req, res) => {
      const { email } = req.params;
      const filter = { email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result: result });
    });
    //deleting a user
    app.delete("/user/:email", varifyJWT, async (req, res) => {
      const { token } = req;
      if (token.role === "admin") {
        const { email } = req.params;
        const query = { email };
        const result = userCollection.deleteOne(query);
        res.send(result);
      } else {
        res.send({ error: "unauthorised" });
      }
    });
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
      res.send({ token });
    });
  } finally {
  }
};
run().catch(console.log);
// all the http requests wil be here

app.listen(port, () => {
  console.log("node server is started");
});

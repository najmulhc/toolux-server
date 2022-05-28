const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const Stripe = require("stripe");
const stripe = Stripe('sk_test_51L3kPXCvrp1O0hXl6risEm9b18qNc2iJfz9tGadlGWRdUZdLHff44Vu9gXgDFi7dEodLWFVzLE3IjRUDVyqAPI8P00oBPe9vSP')
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, Admin, ObjectId } = require("mongodb");
const { ObjectID } = require("bson");
const res = require("express/lib/response");
const req = require("express/lib/request");
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
    const orderCollection = client.db("orders").collection("order");
    const reviewCollection = client.db("reviews").collection("review");

    app.post("/create-payment-intent", async (req, res) => {
      const { cost} = req.body; 
      console.log(cost);
      if (cost) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: cost*100 ,
          currency: "usd",
          payment_method_types: ["card"]
        });
      
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
   }
    });

    // for reviews
    app.get("/review", async (req, res) => {
      const query = {};
      const basic = await reviewCollection.find(query).toArray();
      const final = basic.reverse().splice(0, 3);
      res.send(final);
    })
    app.post("/review",  async (req, res) => {
      const review  = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result)
    });
    // for all orders
    app.post("/order", varifyJWT, async (req, res) => {
      const order = req.body;
      if (req.token.role === "user") {
        const result = await orderCollection.insertOne(order);
        res.send(result);
      } else {
        res.send({ error: "you are not a authorised user!" });
      }
    });
 
    app.delete("/order/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })
    app.get("/order/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) }
      const result = await orderCollection.findOne(query);
      res.send(result)
    })
    app.get("/order", varifyJWT, async (req, res) => {
      const query = {};
      if (req.token.role === "admin") {
        const result = await orderCollection.find(query).toArray();
        res.send(result);
      } else {
        res.send({ error: "you do not have permission to view all orders" });
      }
    });
    //for single user query
    app.get("/orders", async (req, res) => {
      const { user } = req.query;
      const query = { customer: user };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
    });
    app.put("/order/:id", async (req, res) => {
      const { id} = req.params;
      const filter = { _id : ObjectId(id) };
      const updated = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...updated,
        },
      };
      const result = await orderCollection.updateOne(filter, updateDoc, options);
      res.send({ result: result });
    });
    app.put("/order/deliver/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) }
      const order = await orderCollection.findOne(query)
      const { productId } = order;
      const productQuery = { _id: ObjectId(productId) };
      const product = await productCollection.findOne(productQuery);
      const currentStock = product.stock - order.quantity;
      const updateProd = {
        $set: {
          stock: currentStock
        }
      }
      const productResult = await productCollection.updateOne(productQuery, updateProd);
      const updateOrd = {
       $set: {
          state:"delivered"
        }
      }
      const orderResult = await orderCollection.updateOne(query, updateOrd);
      console.log(productResult, orderResult);
      res.send({test: "tes"})
    })

    // for product
    app.get("/product", async (req, res) => {
      const query = {};
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/product/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });
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

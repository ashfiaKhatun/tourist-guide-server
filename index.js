const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://tourist-guide-d1f39.web.app"
        ]
    })
);
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.begblt8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const usersCollection = client.db("tourGuideDB").collection("users");
        const packageCollection = client.db("tourGuideDB").collection("tourPackages");
        const bookingsCollection = client.db("tourGuideDB").collection("bookedPackage");
        const storyCollection = client.db("tourGuideDB").collection("stories");


        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
            res.send({ token });
        })

        // middlewares
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)

            const isAdmin = user?.role === 'Admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        // users related api

        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })


        // get admin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false;
            if (user) {
                admin = user?.role === 'Admin'
            }
            res.send({ admin })
        })


        // get Tourist Guide
        app.get('/users/guide/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let guide = false;
            if (user) {
                guide = user?.role === 'Tourist Guide'
            }
            res.send({ guide })
        })

        // get Tourist
        app.get('/users/tourist/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let tourist = false;
            if (user) {
                tourist = user?.role === 'Tourist'
            }
            res.send({ tourist })
        })



        app.post("/users", async (req, res) => {
            const user = req.body;
            // insert email if user doesn't exist
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exist' });
            }

            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        // make Tourist Guide
        app.patch('/users/guide/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: {
                    role: 'Tourist Guide'
                }
            }

            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        // get guides 

        app.get('/users/guides', async (req, res) => {
            const result = await usersCollection.find({ role: "Tourist Guide" }).toArray();
            res.send(result)
        })



        // make admin
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const updatedDoc = {
                $set: {
                    role: 'Admin'
                }
            }

            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })



        // Tour packages

        app.get('/tour-package', async (req, res) => {
            const result = await packageCollection.find().toArray();
            res.send(result)
        })

        app.get('/tour-package/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await packageCollection.findOne(query);
            res.send(result)
        })

        app.post("/tour-package", verifyToken, verifyAdmin, async (req, res) => {
            const packages = req.body;
            const result = await packageCollection.insertOne(packages);
            res.send(result)
        })


        // Bookings

        app.post("/bookings", verifyToken, async (req, res) => {
            const packages = req.body;
            const result = await bookingsCollection.insertOne(packages);
            res.send(result)
        })


        //get stories
        app.get('/story', async (req, res) => {
            const result = await storyCollection.find().toArray();
            res.send(result)
        })

        // Upload Story
        app.post("/story", verifyToken, async (req, res) => {
            const story = req.body;
            const result = await storyCollection.insertOne(story);
            res.send(result)
        })




        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("Tourist Guide is running");
})
app.listen(port, () => {
    console.log(`Server running in port: ${port}`);
})

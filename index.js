const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
require('dotenv').config();
const {MongoClient, ServerApiVersion} = require('mongodb');
const app = express();
const port = process.env.PORT || 5000


// middleware use here
app.use(cors({
    origin: [
        // 'http://localhost:5173',
        'https://food-donation-project-3e8c9.web.app',
        'https://food-donation-project-3e8c9.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());


// verifyToken here
const verifyToken = (req, res, next) => {
    const token = req ?.cookies?.token;
    if (!token) {
        return res.status(401).send({
            message: 'Unauthorized access'
        })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                message: 'Unauthorized access'
            })
        }
        req.user = decoded;
        next()
    });

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.algulij.mongodb.net/?retryWrites=true&w=majority`;

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

        // collection here
        const userCollection = client.db("foodDonationDB").collection("user");
        const foodCollection = client.db("foodDonationDB").collection("foods");
        const foodRequestCollection = client.db("foodDonationDB").collection("foodRequest");


         // -------------------Authentication related api------------
         app.post('/jwt', async (req, res) => {
             const user = req.body;
             const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                 expiresIn: '1h'
             })
             res.cookie('token', token, {
                     httpOnly: true,
                     secure: process.env.NODE_ENV === 'production',
                     sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                 })
                 .send({
                     success: true
                 })
         })
        // logout and clear cookies data
        app.post('/logout', async (req, res) => {
            const user = req.body;
            res
                .clearCookie('token', {
                    maxAge: 0
                })
                .send({
                    success: true
                })
        })

        // -------userCollection here---------
        app.post('/user', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/user', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const updateData = {
                $set: {
                    lastLoginAt: user.lastLoginAt,
                }
            }
            const result = await userCollection.updateOne(filter, updateData);
            res.send(result);

        })

        // -------foodCollection here---------
        app.post('/foods',  async (req, res) => {
            const foodsData = req.body;
            const result = await foodCollection.insertOne(foodsData);
            res.send(result);
        })

        app.get('/foods', async (req, res) => {
            const foodQuantity = await foodCollection.find().sort('food_quantity', -1)
            .limit(6)
            .toArray()
            const expiredDate = await foodCollection.find().sort('expired_date', 1)
            .limit(3)
            .toArray()
            const allFood = await foodCollection.find()
            .toArray()
            res.send({
                featureFood: foodQuantity,
                foodAll: allFood,
                expiredDate: expiredDate
            });
        })

        // --------------foodRequestCollection------------
        app.get('/foodRequest', verifyToken, async (req, res) => {
            const loggedEmail = req.query.email;
            const query = {userEmail: loggedEmail};
            const result = await foodRequestCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/foodRequest', async(req, res) => {
            const foodRequestData = req.body;
            console.log(foodRequestData)
            const result = await foodRequestCollection.insertOne(foodRequestData);
            res.send(result);
        })
//





        // Send a ping to confirm a successful connection
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// testing routes here 
app.get('/', (req, res) => {
    res.send('Food donation server...')
})

app.listen(port, () => {
    console.log(`food donation server on port ${port}`)
})
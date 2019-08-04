const Mongoose = require('mongoose').Mongoose;
var ObjectID = require('mongodb').ObjectID;
const bodyParser = require("body-parser");
const CryptoJS = require("crypto-js");
const mongoose = require("mongoose");
const express = require("express");
var cors = require('cors');

// DataBase Connection
var chatManager = new Mongoose();
chatManager.connect("mongodb://nt-test:cqEu8v4Un6VimhVo@nt-test-shard-00-00-0tdov.mongodb.net:27017,nt-test-shard-00-01-0tdov.mongodb.net:27017,nt-test-shard-00-02-0tdov.mongodb.net:27017/chatManager?ssl=true&replicaSet=nt-test-shard-0&authSource=admin&retryWrites=true&w=majority", { useNewUrlParser: true }).then(console.dir("Connecting to MongoDB - ChatManager..."));

// Collection Objects
var chats = chatManager.model("chats", mongoose.Schema({userId: String, timestamp: Number, chats: Object},{ strict: false }), "chats");

const app = express();
const whitelist = ['*'];
var corsOptionsDelegate = (req, callback) => {
    let corsOptions = {
        allowedMethods: ["POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
    };
    if (whitelist.indexOf(req.header('Origin')) !== -1||whitelist.indexOf("*") !== -1) {
      corsOptions['origin'] = true // reflect (enable) the requested origin in the CORS response
    } else {
        corsOptions['origin'] = false // disable CORS for this request
    }
    callback(null, corsOptions); // callback expects two parameters: error and options
}

const nuclechatRouter = require("./routes/nuclechat");
app.use(cors(corsOptionsDelegate));

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.json());

app.use(nuclechatRouter);

const server = app.listen(3000, "127.0.0.1");
const io = require("./socket").init(server);

io.on("connection", socket=>{
    console.log(socket.client.conn.server.clientsCount);
    socket.on("message", data=>{
        let hashDec = CryptoJS.RabbitLegacy.decrypt(data.hash, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0");
        let hash = hashDec.toString(CryptoJS.enc.Utf8);
        let dataDec = CryptoJS.RabbitLegacy.decrypt(data.data, hash);
        data = JSON.parse(dataDec.toString(CryptoJS.enc.Utf8));
        let id =  CryptoJS.RabbitLegacy.decrypt(data.id, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0");
        id = id.toString(CryptoJS.enc.Utf8);
        if(data.type=="append"){
            chats.find({userId: id}).sort({"timestamp":-1}).then(meta=>{
                meta[0].chats = data.data;
                meta[0].timestamp = data.timestamp;
                meta[0].markModified("chats");
                meta[0].save(err=>{
                    if(err) console.log(err);
                });
            });
        }else if(data.type=="new"){
            let insert_data = {userId: id, chats: data.data, timestamp: data.timestamp, _id: new ObjectID()}
            chats.insertMany([insert_data], (err, docs)=>{});
        }
    });
});
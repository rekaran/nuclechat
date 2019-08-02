const bodyParser = require("body-parser");
const CryptoJS = require("crypto-js");
const express = require("express");
var cors = require('cors');

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
    console.log(Object.keys(socket.connected));
    socket.on("message", data=>{
        let hashDec = CryptoJS.RabbitLegacy.decrypt(data.hash, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0");
        let hash = hashDec.toString(CryptoJS.enc.Utf8);
        let dataDec = CryptoJS.RabbitLegacy.decrypt(data.data, hash);
        data = dataDec.toString(CryptoJS.enc.Utf8);
        console.log(data);
    });
});
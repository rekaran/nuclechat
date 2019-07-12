const bodyParser = require("body-parser");
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

app.use((req, res, next)=>{
    res.status(404).redirect("/")
});

const server = app.listen(3000, "127.0.0.1");
// const io = require("./socket").init(server);

// io.on("connection", socket=>{
//     console.log("client connected");
// });
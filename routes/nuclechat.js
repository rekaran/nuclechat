const express = require("express");
const mongoose = require("mongoose");
const Mongoose = require('mongoose').Mongoose;
// const redis = require("redis");
const CryptoJS = require("crypto-js");
// const io = require('../socket');

const router = express.Router();
// DataBase Connection
var dataManager = new Mongoose();
dataManager.connect("mongodb://nt-test:cqEu8v4Un6VimhVo@nt-test-shard-00-00-0tdov.mongodb.net:27017,nt-test-shard-00-01-0tdov.mongodb.net:27017,nt-test-shard-00-02-0tdov.mongodb.net:27017/dataManager?ssl=true&replicaSet=nt-test-shard-0&authSource=admin&retryWrites=true&w=majority", { useNewUrlParser: true }).then(console.dir("Connecting to MongoDB - DataManager..."));
var resourceManager = new Mongoose();
resourceManager.connect("mongodb://nt-test:cqEu8v4Un6VimhVo@nt-test-shard-00-00-0tdov.mongodb.net:27017,nt-test-shard-00-01-0tdov.mongodb.net:27017,nt-test-shard-00-02-0tdov.mongodb.net:27017/resourceManager?ssl=true&replicaSet=nt-test-shard-0&authSource=admin&retryWrites=true&w=majority", { useNewUrlParser: true }).then(console.dir("Connecting to MongoDB - ResourceManager..."));
// var rclient = redis.createClient();

// Collection Objects
var shielded = dataManager.model("shielded", new mongoose.Schema({ strict: false }), "shielded");
var metamorph = dataManager.model("metamorph", new mongoose.Schema({ strict: false }), "metamorph");
var keymapper = dataManager.model("keymapper", new mongoose.Schema({ strict: false }), "keymapper");
var resources = resourceManager.model("resources", new mongoose.Schema({ strict: false }), "resources");

// Javascript Function
var getTimestamp = offset =>{
    let date = new Date();
    // date.setHours(0,0,0,0);
    let utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    let newDate = new Date(utc + (3600000*offset));
    return newDate.getTime();
};

// Express Routes
router.post("/key/:domain", (req, res, next)=>{
    try {
        const domain = req.params.domain;
        let hash = req.body.key;
        let header_hash = req.get('Authorization');
        let origin = req.get('origin').split("://")[1];
        var userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if(header_hash===hash&&origin===domain){
            keymapper.findOne({domain: domain, hash: header_hash}).then(meta=>{
                let data = {domain: meta.get('domain'), key: meta.get('key'), is_debug: meta.get('is_debug'), is_cache: meta.get('is_cache'), wss: meta.get('wss'), timestamp: getTimestamp('+5.5'), hash: header_hash, saveTime: meta.get("saveTimestamp"), greetings: meta.get("first_message"), context: {"#brand": meta.get("company_name"), "#botname": meta.get("bot_name")}}
                if(Object.keys(meta).length!==0){
                    if(origin===meta.get('domain')&&meta.get('is_live')&&meta.get('is_active')&&header_hash==meta.get('hash')){
                        if(meta.get('limitflag')){
                            if(meta.get('usercount')<=meta.get('userlimit')){
                                res.send(data);
                            }else{
                                res.status(404).send({});
                            }
                        }else{
                            res.send(data);
                        }
                    }else{
                        res.status(404).send({});
                    }
                }else{
                    res.status(404).send({});
                }
            });
        }else{
            res.status(404).send({});
        }
        console.log("Key -> ", origin, userIP);
    }catch(err){
        console.error(err);
        res.status(404).send({});
    }
});

router.post("/data/:domain", (req, res, next)=>{
    try{
        const domain = req.params.domain;
        let hash = req.body.key;
        let header_hash = req.get('Authorization');
        let timestamp = req.headers.timestamp;
        let origin = req.get('origin').split("://")[1];
        var userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if(header_hash===hash&&origin===domain){
            // First Check timestamp+hash in redis, if the data is not present in redis then get from mongodb
            metamorph.find({projectHash: header_hash}).sort({"timestamp":-1}).then(meta=>{
                if(meta.length===0){
                    res.send({});
                }else{
                    res.send(meta[0].get("data"));
                }
            });
        }else{
            res.status(301).redirect("https://www.nucletech.com");
        }
        console.log("Data -> ", origin, userIP);
    }catch(err){
        console.error(err);
        res.status(404).send({});
    }
});

router.post("/datas/:domain", (req, res, next)=>{
    try{
        const domain = req.params.domain;
        let hash = req.body.key;
        let header_hash = req.get('Authorization');
        let timestamp = req.body.timestamp;
        let origin = req.get('origin').split("://")[1];
        var userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if(header_hash===hash&&origin===domain){
            // First Check timestamp+hash in redis, if the data is not present in redis then get from mongodb
            shielded.find({projectHash: header_hash}).sort({"timestamp":-1}).then(meta=>{
                if(meta.length===0){
                    res.send({});
                }else{
                    res.send(meta[0].get("data"));
                }
            });
        }else{
            res.status(301).redirect("https://www.nucletech.com");
        }
        console.log("Datas -> ", origin, userIP);
    }catch(err){
        console.error(err);
        res.status(404).send({});
    }
});

router.post("/resources/:domain", (req, res, next)=>{
    try{
        const domain = req.params.domain;
        let hash = req.body.key;
        let key = req.body.keys;
        let header_hash = req.get('Authorization');
        let timestamp = req.body.timestamp;
        let origin = req.get('origin').split("://")[1];
        var userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if(header_hash===hash&&origin===domain){
            // Query Resource Manager to get list of resources against key send by the client and return sync and async resources
            resources.findOne({projectHash: header_hash, domain: domain, projectKey: key}).sort({"timestamp":-1}).then(meta=>{
                if(Object.keys(meta).length!==0){
                    res.send(meta.get("resources"));
                }else{
                    res.status(301).redirect("https://www.nucletech.com");
                }
            });
        }else{
            res.status(301).redirect("https://www.nucletech.com");
        }
        console.log("Resouces -> ", origin, userIP);
    }catch(err){
        console.error(err);
        res.status(404).send({});
    }
});

router.post("/encode/:domain", (req, res, next)=>{
    try{
        const domain = req.params.domain;
        let hash = req.body.key;
        let data = req.body.data;
        let variations = req.body.variation;
        let key = req.body.hash;
        let intent = req.body.intent;
        let flow = req.body.flow;
        let header_hash = req.get('Authorization');
        let timestamp = getTimestamp('+5.5');
        let origin = req.get('origin').split("://")[1];
        var userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if(header_hash===hash&&origin===domain){
            // Check if the data is cached in redis or not, if it is cached then replace both metamorph as well as shilded
            let encData = {answers: data, intents: intent, variations: variations, flows: flow};
            let encryptedData = CryptoJS.RabbitLegacy.encrypt(JSON.stringify(encData), key).toString();
            let shilded_data = {data: encryptedData, domain: domain, projectHash: header_hash, projectKey: key, timestamp: timestamp}
            res.send(shilded_data);
            // let bytes  = CryptoJS.RabbitLegacy.decrypt(encryptedData, key);
            // let decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        }else{
            res.status(301).redirect("https://www.nucletech.com");
        }
        console.log("Encode -> ", origin, userIP);
    }catch(err){
        console.error(err);
        res.status(404).send({});
    }
});

router.use("/", (req, res, next)=>{
    res.status(301).redirect("https://www.nucletech.com");
});

module.exports = router;
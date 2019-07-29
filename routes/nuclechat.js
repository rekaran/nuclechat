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
let getTimestamp = offset =>{
    let date = new Date();
    // date.setHours(0,0,0,0);
    let utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    let newDate = new Date(utc + (3600000*offset));
    return newDate.getTime();
};

let randomNumber = length =>{
    let rn = "";
    let c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for(let i=0; i<length; i++){
        rn += c.charAt(Math.floor(Math.random()*c.length));
    }
    return rn;
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
            let dataDec = CryptoJS.RabbitLegacy.decrypt(header_hash, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0");
            header_hash = dataDec.toString(CryptoJS.enc.Utf8);
            keymapper.findOne({domain: domain, hash: header_hash}).then(meta=>{
                console.log(Object.keys(req.body).includes("id"));
                let cust_id = "";
                if(Object.keys(req.body).includes("id")===false){
                    cust_id = meta.get("projectId").split("_")[0]+"_"+meta.get("globalcount")+"_"+randomNumber(6);
                    cust_id = CryptoJS.RabbitLegacy.encrypt(cust_id, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0").toString();
                    keymapper.update({_id: meta.get("_id")}, {globalcount: (meta.get("globalcount")+1)});
                }else{
                    cust_id = req.body.id;
                }
                console.log(cust_id);
                if(Object.keys(meta).length!==0){
                    let pushmessages = meta.get("pushmessage");
                    let pushmessage = pushmessages[req.get("Referer")] || {};
                    if(pushmessage!=={}){
                        delete pushmessage["type"];
                    }
                    let greetings = meta.get("firstmessages")[req.get("Referer")] || meta.get("first_message");
                    let data = {id: cust_id, domain: meta.get('domain'), key: meta.get('key'), is_debug: meta.get('is_debug'), is_cache: meta.get('is_cache'), wss: meta.get('wss'), timestamp: getTimestamp('+5.5'), hash: hash, saveTime: meta.get("saveTimestamp"), greetings: greetings, pushmessage: pushmessage, context: {"#brand": meta.get("company_name"), "#botname": meta.get("bot_name")}}
                    if(origin===meta.get('domain')&&meta.get('is_live')&&meta.get('is_active')&&header_hash==meta.get('hash')){
                        if(meta.get('limitflag')){
                            if(meta.get('usercount')<=meta.get('userlimit')){
                                let encryptedData = CryptoJS.RabbitLegacy.encrypt(JSON.stringify(data), header_hash).toString();
                                res.send(encryptedData);
                            }else{
                                res.status(404).send({});
                            }
                        }else{
                            let encryptedData = CryptoJS.RabbitLegacy.encrypt(JSON.stringify(data), header_hash).toString();
                            res.send(encryptedData);
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
        console.log(err);
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
            let dataDec = CryptoJS.RabbitLegacy.decrypt(header_hash, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0");
            header_hash = dataDec.toString(CryptoJS.enc.Utf8);
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
        console.log(err);
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
            let dataDec = CryptoJS.RabbitLegacy.decrypt(header_hash, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0");
            header_hash = dataDec.toString(CryptoJS.enc.Utf8);
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
        console.log(err);
        res.status(404).send({});
    }
});

router.post("/resources/:domain", (req, res, next)=>{
    try{
        const domain = req.params.domain;
        let hash = req.body.key;
        let header_hash = req.get('Authorization');
        let timestamp = req.body.timestamp;
        let origin = req.get('origin').split("://")[1];
        var userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        if(header_hash===hash&&origin===domain){
            let dataDec = CryptoJS.RabbitLegacy.decrypt(header_hash, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0");
            header_hash = dataDec.toString(CryptoJS.enc.Utf8);
            // Query Resource Manager to get list of resources against key send by the client and return sync and async resources
            resources.findOne({projectHash: header_hash, domain: domain}).sort({"timestamp":-1}).then(meta=>{
                if(Object.keys(meta).length!==0){
                    let encryptedData = CryptoJS.RabbitLegacy.encrypt(JSON.stringify(meta.get("resources")), meta.get("projectKey")).toString();
                    res.send(encryptedData);
                }else{
                    res.status(301).redirect("https://www.nucletech.com");
                }
            });
        }else{
            res.status(301).redirect("https://www.nucletech.com");
        }
        console.log("Resouces -> ", origin, userIP);
    }catch(err){
        console.log(err);
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
        if(header_hash===hash){
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
        console.log(err);
        res.status(404).send({});
    }
});

router.post("/hash_encode/:domain", (req, res, next)=>{
    try{
        const hash = req.body.hash;
        let encryptedData = CryptoJS.RabbitLegacy.encrypt(hash, "QC2oLKfCCACpXOZbJ9YQsm/Gq4QdhjWAW0qmyNcVqO/q3Ec+1Efte5zZgftUDoE4YXdGUVLbTz5IhOP0").toString();
        res.send(encryptedData);
    }catch(err){
        console.log(err);
        res.status(404).send({});
    }
});

router.use("/", (req, res, next)=>{
    res.status(301).redirect("https://www.nucletech.com");
});

module.exports = router;
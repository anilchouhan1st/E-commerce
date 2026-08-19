require('dotenv').config();
const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectToDb = async () => {
    try {
        await mongoose.connect(process.env.mongo_URL);
        console.log('Database is connected successfully');
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}
module.exports = connectToDb;

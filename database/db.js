// const mongoose = require("mongoose");
// const dns = require("dns");

// dns.setServers(["8.8.8.8", "8.8.4.4"]);

// const connectToDb = async () => {
//     try {
//         await mongoose.connect(process.env.mongo_URL);
//         console.log('Database is connected successfully');
//     } catch (e) {
//         console.log(e);
//         process.exit(1);
//     }
// }
// module.exports = connectToDb;

const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function connectToDatabase() {
    const mongoUri = process.env.MONGODB_URI || process.env.mongo_URL;

    if (!mongoUri) {
        throw new Error("MONGODB_URI is not configured.");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
}

module.exports = { connectToDatabase };

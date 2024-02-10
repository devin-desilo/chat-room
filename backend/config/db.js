const mongoose  = require("mongoose");
const colors = require("colors");

const connectDB = async() => {
    try {
        const conn = await mongoose.connect("mongodb+srv://Devin27:Devin@cluster0.p1ssovg.mongodb.net/chat");

        console.log(`mongo db connected : ${conn.connection.host}`.cyan.underline)
    } catch (error) {
        console.log(`Error: ${error.message}`.red.bold);
        process.exit();
    }
};


module.exports = connectDB;
const mongoose = require('mongoose');
const {CONSTRING} = require('../config/index');

const conString = CONSTRING;

const dbconnect = async () => {

    try {
        const conn = await mongoose.connect(conString);
        console.log(`Database connected to Host ${conn.connection.host}`);

    } catch (error) {
        console.log(`Error : ${error}`);
    }
}

module.exports = dbconnect;
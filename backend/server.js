const express = require('express');
const dbconnect = require('./database/index');
const router = require('./routes/index');
const {PORT} = require('./config/index');
const errorHandler = require('./middleweres/errorHandler');
const cookieParser = require('cookie-parser');


const app = express();
const port = PORT;        // can also be neglected and used directly below in app.listen

app.use(cookieParser());  //registration of cookie parser
app.use(express.json());  // middlewares

app.use(router);

dbconnect();

app.use('/storage', express.static('storage'));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend is running on port: ${port}`)});
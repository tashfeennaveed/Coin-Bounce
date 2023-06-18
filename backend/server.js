const express = require('express');
const dbconnect = require('./database/index');
const router = require('./routes/index');
const {PORT} = require('./config/index');
const errorHandler = require('./middleweres/errorHandler');
const cookieParser = require('cookie-parser');
const cors = require("cors");


const corsOptions = {
  credentials: true,
  origin: ["http://localhost:3000"],
};

const app = express();
const port = PORT;        // can also be neglected and used directly below in app.listen

app.use(cookieParser());  //registration of cookie parser


app.use(cors(corsOptions));  // Cross-Origin Resource Sharing

app.use(
  cors({
    origin: function (origin, callback) {
      return callback(null, true);
    },
    optionsSuccessStatus: 200,
    credentials: true,
  })
)



app.use(express.json({ limit: "50mb" }));  // middlewares

app.use(router);

dbconnect();

app.use('/storage', express.static('storage'));

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend is running on port: ${port}`)});
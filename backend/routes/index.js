const express = require('express');
const authController = require('../controller/authController');
const auth = require('../middleweres/auth');

const router = express.Router();
 
 router.post('/register',authController.register);
 router.post('/login',authController.login);
 router.post('/logout',auth ,authController.logout);

 router.get('/refresh',auth ,authController.refresh);


module.exports = router;
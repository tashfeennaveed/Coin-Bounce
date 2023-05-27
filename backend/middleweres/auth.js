const JWTServices = require('../services/JWTService');
const User = require('../models/user');
const UserDTO = require('../dto/user');
const auth = async (req, res, next) => {
   try {
     //1. refresh, access token validation
     const {accessToken, refreshToken} = req.cookies ;

     if (!accessToken || !refreshToken){
         const error = {
             status: 401,
             message: 'Unauthorized'
         }
 
         return next(error)
     }
 
     let _id;
 
     try {
         _id = JWTServices.verifyAccessToken(accessToken);
     } 
     catch (error) {
         return next(error);
     }
 
     let user;
     try {
         user= await User.findOne({_id: _id});
     } 
     catch (error) {
        return next(error);
     }
 
     const userDTO = new UserDTO(user);
 
     req.user = userDTO;
     next();

   } 
   catch (error) {
       return next(error);
   }
     
} ; 

module.exports = auth;
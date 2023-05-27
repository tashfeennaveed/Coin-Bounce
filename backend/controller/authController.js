const Joi = require('joi');  // require ma j small but const ma big because we are extracting a class
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const UserDTO = require('../dto/user');
const JWTServices = require('../services/JWTService');
const RefreshToken = require('../models/token');


const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;

const authController = {
    async register(req, res, next){
        //1. validate user input  ...by joi library 

        const userRegisterSchema = Joi.object({     //  immmpppp =  object jOI ka hai
            username: Joi.string().min(5).max(30).required(),
            name: Joi.string().max(30).required(),
            email: Joi.string().email().required(), 
            password: Joi.string().pattern(passwordPattern).required(),
            confirmPassword: Joi.ref('password')
        });

        const {error} = userRegisterSchema.validate(req.body);

        //2. if error in validation -> return error via middlewere

        if (error){
            return next(error);
        }
        //3. if email or username is already registered -> return an error

        const {username, name, email, password} = req.body;

        try {
            const emailInUse = await User.exists({email});

            const usernameInUse = await User.exists({username});

            if(emailInUse){
                const error = {
                    status :409, //409 is status oferror of conflict
                    message: 'E-mail is already registered, use another email!'
                }

                return next (error);
            }

            if(usernameInUse){
                const error = {
                    status :409, //409 is status oferror of conflict
                    message: 'Username not available, choose another username! '
                }

                return next (error);
            }

        } catch (error) {
            return next (error);
        }
        //4. password hash

        const hashedPassword = await bcrypt.hash(password, 10) ;  //hash(variable, number of additional sortings(additional security))

        //5. store userdata in db
        let accessToken;
        let refreshToken;
        let user;

        try {
            const userToRegister = new User({
                username,
                email,
                name,
                password: hashedPassword
            }) ;

            user = await userToRegister.save();

        accessToken = JWTServices.signAccessToken({_id: user._id}, '30m'); // expiry time is in minutes
        
        refreshToken = JWTServices.signRefreshToken({_id: user._id}, '60m');

        } catch (error) {
            return next (error);
        }

        //store refresh token
        await JWTServices.storeRefreshToken(refreshToken, user._id);

        //send tokens in cookies
        res.cookie('accessToken', accessToken, {
            maxAge: 1000*60*60*24,              // maxage matlb expiry time in mili sec
            httpOnly: true
        });

        res.cookie('refreshToken', refreshToken, {
            maxAge: 1000*60*60*24,              // maxage matlb expiry time in mili sec
            httpOnly: true
        });

        //6. response send
        const userDto = new UserDTO(user);

        return res.status(201).json({user: userDto, auth: true});  // status(201) is for creating somthing
    },













    async login(req, res, next){

        //1. validate user input  ...by joi library

        const userLoginSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(), 
            password: Joi.string().pattern(passwordPattern).required()
        }) ;

        const {error} = userLoginSchema.validate(req.body) ;

        //2. if validation error -> return error via middlewere
        if (error){
            return next(error);
        }

        //3. match username and password
        const {username, password} = req.body ;

        let user;

        try {
            user = await User.findOne({username: username}) ;

            if(!user){
                const error = {
                    status: 401,
                    message: 'Invalid username'
                } ;

                return next(error);
            }

            const match = await bcrypt.compare(password, user.password) ;

            if(!match){
                const error = {
                    status: 401,
                    message: 'Invalid passward'
                } ;

                return next(error);

            }


        } catch (error) {
            console.log('acascasc');
            return next(error);
        }
 
        //4. return response
        // tokens
        accessToken = JWTServices.signAccessToken({_id: user._id}, '30m');
        refreshToken = JWTServices.signRefreshToken({_id: user._id}, '60m');

        //update refresh token in db
        try {
            await RefreshToken.updateOne(
                {_id: user._id},
                {token: refreshToken},
                {upsert: true});

        } catch (error) {
            return next(error);
        }
        
        //send token in cookie
        res.cookie('accessToken', accessToken, {
            maxAge: 1000*60*60*24,              // maxage matlb expiry time in mili sec
            httpOnly: true
        });

        res.cookie('refreshToken', refreshToken, {
            maxAge: 1000*60*60*24,            
            httpOnly: true
        });
        
        //res
        const userDto = new UserDTO(user);

        return res.status(200).json({userDto, auth: true});
    },












    async logout(req, res, next){
        // console.log(req)
        //1. delete refresh token from db
        const {refreshToken} = req.cookies ;

        try {
            await RefreshToken.deleteOne({token: refreshToken});
        } catch (error) {
            return next(error);
        }

        // delete cookies
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        //2. response
        res.status(200).json({user: null, auth: false});
    },












    async refresh(req, res, next){
        //1. get refreshToken from cookies
        const originalRefreshToken = req.cookies.refreshToken ;

        //2. verify refreshToken
        let id;

        try {
            id = JWTServices.verifyRefreshToken(originalRefreshToken)._id;
        } catch (e) {
            const error = {
                status:401,
                message: 'Unauthorized'
            }

            return next(error);
        }

        try {
            const match = RefreshToken.findOne({_id: id, token: originalRefreshToken}) ;

            if(!match){
                const error = {
                    status:401,
                    message: 'Unauthorized'
                }
    
                return next(error);
            }
        } catch (e) {
            return next(e);
        }
        //3. generate new tokens
        try {
            const accessToken = JWTServices.signAccessToken({_id: id}, '30m');
            const refreshToken = JWTServices.signRefreshToken({_id: id}, '60m');
            //update db
            await RefreshToken.updateOne(
                {_id: id},
                {token: refreshToken},);

            res.cookie('accessToken', accessToken, {
                maxAge: 1000*60*60*24,              // maxage matlb expiry time in mili sec
                httpOnly: true
            });

            res.cookie('refreshToken', refreshToken, {
                maxAge: 1000*60*60*24,            
                httpOnly: true
            });

        } catch (e) {
            return next(e);
        }
        //4. return response
        const user = await User.findOne({_id: id}) ;

        const userDto = new UserDTO(user) ;

        return res.status(200).json({user: userDto, auth: true});


    }
}

module.exports = authController;
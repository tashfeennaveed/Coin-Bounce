const Joi = require("joi");
const fs = require('fs');
const {BACKEND_SERVER_PATH} = require('../config/index');
const BlogDTO = require('../dto/blog');
const BlogDetailsDTO = require('../dto/blog-details');
const Blog = require("../models/blog");
const Comment = require('../models/comment');

const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {
    async create(req, res, next){
        // 1. validate req data
        const createBlogSchema = Joi.object({
            title: Joi.string().required(),
            author: Joi.string().regex(mongodbIdPattern).required(),   // regex=regular expression. this one validates k auther vali string kisi database ki id vali string hai ya nahi
            content: Joi.string().required(),
            // client side -> base64 encoded string -> decode -> store -> save photo's path in db
            photo: Joi.string().required(),
        }) ;

        const { error } = createBlogSchema.validate(req.body);

        if (error) {
        return next(error);
        }

        // 2. handle photo storage, naming
        const {title, author, content, photo} = req.body ;

        // read as buffer  //buffer is builtin jis sa binary data ki strings ko manage kia jata hai
        const buffer = Buffer.from( photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""), "base64" );

        // allot a random name
        const imagePath = `${Date.now()}-${author}.png`;

        //save localy
        try {
            fs.writeFileSync(`storage/${imagePath}`, buffer);
        } catch (error) {
            return next(error);
        }

        // 3. add to db
        let newBlog;
        try {
            newBlog = new Blog({
            title,
            author,
            content,
            // photoPath: response.url,
            photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`
        });

        await newBlog.save();
        } 
        catch (error) {
            return next(error);
        }
 
        // 4. return response
        const blogDto = new BlogDTO(newBlog);

        return res.status(201).json({newBlog: blogDto});

    },













    async getAll(req, res, next){
        try {
            const blogs = await Blog.find({});
      
            const blogsDto = [];
      
            for (let i=0; i < blogs.length; i++) {
              const dto = new BlogDTO(blogs[i]);
              blogsDto.push(dto);
            }
      
            return res.status(200).json({ blogs: blogsDto });
            } catch (error) {
                return next(error);
            }
    },














    async getById(req, res, next){
            // validate id
            // response

            const getByIdSchema = Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
            });
      
            const { error } = getByIdSchema.validate(req.params);  // params =parameters in urls
      
            if (error) {
                return next(error);
            }

            let blog;

            const { id } = req.params;

            try {
            blog = await Blog.findOne({ _id: id }).populate('author');  //replace the specified paths in a document with another document from other collections
            } 
            catch (error) {
                return next(error);
            }

            const blogDto = new BlogDetailsDTO(blog);

            return res.status(200).json({ blog: blogDto });
      
    },
    async update(req, res, next){
        // validate
        //photo managment

        const updateBlogSchema = Joi.object({
        title: Joi.string(),
        content: Joi.string(),
        author: Joi.string().regex(mongodbIdPattern).required(),
        blogId: Joi.string().regex(mongodbIdPattern).required(),
        photo: Joi.string(),
        });   

        const { error } = updateBlogSchema.validate(req.body);

        if (error) {
            return next(error);
            }    
        
        const { title, content, author, blogId, photo } = req.body;

        // delete previous photo
        // save new photo

        let blog;

        try {
            blog = await Blog.findOne({ _id: blogId });
        } catch (error) {
            return next(error);
        }
        
        if (photo) {
            let previousPhoto = blog.photoPath;
      
            previousPhoto = previousPhoto.split("/").at(-1);  // split karo db ma pare link ko backslash pa or -1 = last vala argument  vali backslash
      
            // delete photo
            fs.unlinkSync(`storage/${previousPhoto}`);  // unlinksync = del file (not dir) before moving forwad
      
            // read as buffer  //buffer is builtin jis sa binary data ki strings ko manage kia jata hai
            const buffer = Buffer.from( photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""), "base64" );

            // allot a random name
            const imagePath = `${Date.now()}-${author}.png`;

            //save localy
            try {
                fs.writeFileSync(`storage/${imagePath}`, buffer);
            } catch (error) {
                return next(error);
            }
      
            await Blog.updateOne({ _id: blogId },
              {
                title,
                content,
                photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`
              }
            );
          } else {
            await Blog.updateOne({ _id: blogId }, { title, content });
          }
      
          return res.status(200).json({ message: "blog updated!" });

    },
    async delete(req, res, next){
        //validate id

        const deleteBlogSchema = Joi.object({
            id: Joi.string().regex(mongodbIdPattern).required()
        });

        const { error } = deleteBlogSchema.validate(req.params);

        const { id } = req.params;

        if (error) {
            return next(error);
            }

        // delete blog
        // delete comments on that blog

        try {
            await Blog.deleteOne({ _id: id });
      
            await Comment.deleteMany({ blog: id });
          } catch (error) {
            return next(error);
          }
        
        return res.status(200).json({ message: "blog deleted" });
      
    }
} ;
 
module.exports = blogController;
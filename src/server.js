// require("dotenv").config({path : './env'})
import dotenv from "dotenv" ;
import express from "express" ;
import connectDB from "./db/index.js";
import {app} from './app.js'

dotenv.config({
    path : './.env'
})


connectDB() 
.then(()=>{
    app.listen(process.env.PORT || 8000 , ()=>{
        console.log(`⚙️ Server is Listening on ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log("MONGO Connection Failed !!!" , error) ;
})


























/*
(async() => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`) 
        app.on("error",(error)=>{
            console.log("Err",error);
            throw error 
        })

        app.listen(process.env.PORT,()=>{
            console.log(`App is LIstening on ${process.env.PORT}`);
            
        })
    }catch(error){
        console.log("Error",error);
        throw err ;
    }
})
*/


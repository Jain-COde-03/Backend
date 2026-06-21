import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber : {
        type : mongoose.Schema.Types.ObjectId , // One who is Subscribing
        ref : "User"
    } ,
    channel : {
        type : mongoose.Schema.Types.ObjectId , // One to whom user(subscriber) is subscribing
        ref : "User"
    }
},{timestamps:true})

export const Subscription = mongoose.model("Subscription",subscriptionSchema) ;
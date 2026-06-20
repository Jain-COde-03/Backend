import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
    {
        videoFile : {
            type : String , // cloudinary url
            required : true 
        },
        thumbnail : {
            type : String , // Cloudinary url
            required : true 
        } ,
        title : {
            type : String ,
            required : true 
        } ,
        description : {
            type : String ,
            required : true 
        } ,
        duration : {
            type : Number , // Cloudinary url 
            required : true 
        } ,
        view : {
            type : Number ,
            default : 0 
        } ,
        isPublished : {
            type : Boolean ,
            default : true
        } ,
        owner : {
            type : mongoose.Schema.Types.ObjectId ,
            ref : "user"
        }
    },
    {
        timestamps:true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video",videoSchema)
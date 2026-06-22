import {asyncHandler} from "../utils/asyncHandler.js" ;
import { ApiError } from "../utils/apiError.js";
import {User} from '../models/user.model.js'
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { application } from "express";

const generateAccessAndRefreshTokens = async (userId) => { 
    try {
        const user = await User.findById(userId) ;
        const accessToken = user.generateAccessToken() ;
        const refreshToken = user.generateRefreshToken() ;

        user.refreshToken = refreshToken ;
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken} ;
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler(async (req,res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists : username , email
    // check for images , check for avatar
    // upload them to cloudinary , avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const {fullName, email, username, password} = req.body ;
    //console.log("email : ",email) ;

    // if(fullName === ""){
    //     throw new ApiError(400,"fullName is required")
    // }
    if(
        [fullName,email,username,password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All Fields are Required") ;
    }

    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with Email or Username already Exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path ;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path ;
    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path ;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) ;
    const coverImage = await uploadOnCloudinary(coverImageLocalPath) ;
    if(!avatar){
        throw new ApiError(400,"Avatar file is required") ;
    }

    const user = await User.create({
        fullName ,
        avatar : avatar.url ,
        coverImage : coverImage?.url || "" ,
        email,
        password,
        username : username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" 
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering a user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )

})

const loginUser = asyncHandler(async (req,res) => {
    // req body -> data
    // username or email 
    // find the user 
    // password check
    // access and refresh token 
    // send cookie

    const {email, username , password} = req.body
    console.log(email) ;

    if(!username && !email) {
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist") ;
    }

    const isPasswordValid = await user.isPasswordCorrect(password) ;

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials") ;
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id) ;

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") ;

    const options = {
        httpOnly : true ,
        secure : true 
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser , accessToken , refreshToken
            },
            "User LoggedIn Successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id ,
        {
            $set : {
                refreshToken : undefined 
            }
        }, 
        {
            new : true 
        }
    )

    const options = {
        httpOnly : true ,
        secure : true 
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200 ,
            {} ,
            "User LoggedOut" 
        )
    )
})

const refreshAccessToken = asyncHandler(async (req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request") ;
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.JWT_REFRESH_SECRET
        ) ;
    
        const user = User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token") ;
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is Expired or Used") ;
        }
    
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        const options = {
            httpOnly : true ,
            secure : true
        }
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken : newRefreshToken} ,
                "Access Token Refreshed" 
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token") ;
    }
})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword,newPassword} = req.body ;

    const user = await User.findById(req.user?._id) ;
    const  isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password") ;
    }

    user.password = newPassword ;
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(
        new ApiResponse(
            200 ,
            {} ,
            "Password Is Updated Succesfully"
        )
    )
})

const getCurrentUser = asyncHandler(async (req,res) =>{
    return res.status(200)
    .json(
        new ApiResponse(
            200 ,
            req.user,
            "Current User Fetched Succesfully"
        )
    )
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    const {fullName,email} = req.body

    if(!fullName || !email ){
        throw new ApiError(400 , "All fields are required") ;
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
             $set : {
                fullName , // can be written as fullName : fullName ,
                email  // can be written as email : email ,
             }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Accout Details Updated Successfully"
        )
    )
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing") ;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) ;

    if(!avatar.url){
        throw new ApiError(500 , " Error While Uploading Avatar")
    }

    const oldUser = await User.findById(req.user?._id)

    deleteFromCloudinary(oldUser.avatar) ;

    const user = await User.findByIdAndUpdate(
        req.user?._id ,
        {
            $set : {
                avatar : avatar.url  
            } ,
        } ,
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar Updated Succesfully"
        )
    )

})

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.files?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image is Missing")
    }

    const coverImage = uploadOnCloudinary(coverImageLocalPath) ;

    if(!coverImage.url){
        throw new ApiError(500,"Error While Uploading Cover Image") ;
    }

    const oldUser = await User.findById(req.user?._id)

    deleteFromCloudinary(oldUser.coverImage) ;

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        {new:true}
    ).select("-password") ;

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Cover Image Updated Successfully"
        )
    )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params;
    
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing") ;
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            } ,

        } ,
        {
            $lookup : {
                from : "subscriptions" ,
                localField : "_id" ,
                foreignField : "channel" ,
                as : "subscribers"
            }
        } ,
        {
            $lookup : {
                from : "subscriptions" ,
                localField : "_id" ,
                foreignField : "subscriber" ,
                as : "subscribedTo"
            }
        } ,
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                } ,
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                } ,
                isSubscribed : {
                    $condition : {
                        if : {$in : [req.user?._id,"$subscribers.subscriber"]} ,
                        then : true ,
                        else : false
                    }
                } 
            }
        }, 
        {
            $project : {
                fullName : 1 ,
                useername : 1 ,
                subscribersCount : 1 ,
                channelsSubscribedToCount : 1 ,
                isSubscribed : 1 ,
                avatar : 1 ,
                coverImage : 1 ,
                email : 1 
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"channel does not exists")
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User Channel fetched Succesfully"
        )
    )
})

const getWatchHistory = asyncHandler(async (req,res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectID(req.user._id)
            }
        } ,
        {
            $lookup : {
                from : "videos" ,
                localField : "watchHistory" ,
                foreignField : "_id" ,
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner" ,
                            foreignField : "_id" ,
                            as : "owner" ,
                            pipeline : [
                                {
                                    $project : {
                                        fullName : 1 ,
                                        username : 1 ,
                                        avatar : 1 
                                    }
                                }
                            ]
                        }
                    } ,
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        } ,
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200 ,
            user[0].watchHistory,
            "Watch History Fetched Succesfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser ,
    updateAccountDetails ,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} ;
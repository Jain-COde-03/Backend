import {v2 as cloudinary} from "cloudinary"
import { log } from "console";
import fs from "fs"

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View API Keys' above to copy your API secret
});

const getPublicIdFromUrl = (url) => {
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  
  // Cut everything before and including /upload/vXXXXXXXXX/
  const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/'); 
  
  // Remove the file extension (.jpg, .png, etc.)
  return publicIdWithExtension.split('.').slice(0, -1).join('.');
};


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //upload file on Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type : "auto" ,
            folder : "backend" 
        })
        // file has been uploaded successfully
        // console.log("file is uploaded on cloudinary",response.url);
        fs.unlinkSync(localFilePath) ;
        return response ;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation get failed
        return null ;
    }
}

const deleteFromCloudinary = async (imageUrl) => {
  try {
    const publicId = getPublicIdFromUrl(imageUrl);
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(result); // { result: 'ok' }
  } catch (error) {
    console.error('Deletion failed:', error);
  }
};

export {uploadOnCloudinary,deleteFromCloudinary} ;
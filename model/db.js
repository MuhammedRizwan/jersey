const mongoose=require('mongoose')

//mongo db connection
let db=async()=>{
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connect to mongo db");
  } catch (error) {
    console.log("Database connecting Error");
    process.exit(1)
  }
}













module.exports=db
const express=require("express");
const app = express();
const connectToDb = require('./database/db');
const productRouter=require('./routes/product-routes')
require('dotenv').config();

// middleware
app.use(express.json());

//db
connectToDb();

//product routes
app.use('/store',productRouter);

const PORT=process.env.PORT 
app.listen(PORT,()=>{
    console.log(`Server is listening on ${PORT}`);
})

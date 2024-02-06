const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

require('./config');

const port = process.env.port || 5000;

const authRoute = require('./auth-route');
app.use('/auth',authRoute);

app.get('/',(req,res)=>{
    res.send('Welcome Rathik')
})
app.listen(port,()=>{
    console.log("Server Connected!!!!")
})
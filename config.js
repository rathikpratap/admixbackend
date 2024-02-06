require('dotenv').config();
const mongoose = require('mongoose');
//mongoose.connect("mongodb://0.0.0.0:27017/admix");
mongoose.connect(process.env.DBURL);
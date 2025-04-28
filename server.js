require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const cron = require('node-cron');
// const fetchAndSaveFacebookLeads = require('./auth-route');

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
    origin: 'https://www.login.admixmedia.in',
    credentials:true,
}));

// app.use(cors({
//     origin: 'http://localhost:4200',
//     credentials:true
// }));

require('./config');

const port = process.env.PORT || 3000;

const authRoute = require('./auth-route');
const fetchAndSaveFacebookLeads = require('./auth-route').fetchAndSaveFacebookLeads;
const fetchAndSaveSecondFacebookLeads = require('./auth-route').fetchAndSaveSecondFacebookLeads;
const fetchAndSaveThirdFacebookLeads = require('./auth-route').fetchAndSaveThirdFacebookLeads;

const fetchAndSyncGoogleSheet = require('./auth-route').fetchAndSyncGoogleSheet;
app.use('/auth',authRoute);

app.get('/',(req,res)=>{
    res.send('Welcome Rathik')
});

// Run the job every 1 minute

cron.schedule('* * * * *', async () => {
    console.log('⏳ Running Scheduled Task: Fetching Facebook Leads');
    await fetchAndSaveFacebookLeads();
});

// ✅ Run second job every 1 minutes
cron.schedule('* * * * *', async () => {
    console.log('⏳ Running Scheduled Task: Fetching Second Facebook Leads');
    await fetchAndSaveSecondFacebookLeads();
});

cron.schedule('* * * * *', async() => {
    console.log('⏳ Running Scheduled Task: Fetching Third Facebook Leads');
    await fetchAndSaveThirdFacebookLeads();
});

//Sync Google Sheet
// cron.schedule('* * * * *', async() => {
//     console.log("Running Google Sheet Sync...");
//     fetchAndSyncGoogleSheet();
// });

app.listen(port,()=>{
    console.log("Server Connected!!!!")
});
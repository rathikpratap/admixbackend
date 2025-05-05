require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const cron = require('node-cron');

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
// const fetchAndSaveFacebookLeads = require('./auth-route');

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const salesLead = require('./models/salesLead');
app.use(cors({
    origin: 'https://www.login.admixmedia.in',
    credentials:true,
}));

// app.use(cors({
//     origin: 'http://localhost:4200',
//     credentials: true
// }));

require('./config');

const port = process.env.PORT || 3000;

// Setup Socket.IO
const io = new Server(server, {
    cors: {
        //origin: 'http://localhost:4200', // Change this in production
        origin: 'https://www.login.admixmedia.in',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make Socket.IO globally accessible
global.io = io;

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('register-user', (username) =>{
        socket.username = username;
        socket.join(username);
        console.log(`📌 ${username} joined their room`);
    });

    socket.on('snooze-reminder', async (data) => {
        const { number, name } = data;
        try {
            const lead = await salesLead.findOne({ custName: name, custNumb: number });
            if (lead) {
                const newReminderTime = new Date();
                newReminderTime.setMinutes(newReminderTime.getMinutes() + 15);
                lead.callReminderDate = newReminderTime;
                await lead.save();
    
                socket.emit('snooze-success', { message: `Reminder snoozed for 15 minutes.` });
            } else {
                socket.emit('snooze-error', { message: `Lead not found.` });
            }
        } catch (err) {
            socket.emit('snooze-error', { message: `Failed to snooze reminder.` });
            console.error('Snooze error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

const authRoute = require('./auth-route');
const fetchAndSaveFacebookLeads = require('./auth-route').fetchAndSaveFacebookLeads;
const fetchAndSaveSecondFacebookLeads = require('./auth-route').fetchAndSaveSecondFacebookLeads;
const fetchAndSaveThirdFacebookLeads = require('./auth-route').fetchAndSaveThirdFacebookLeads;

//const fetchAndSyncGoogleSheet = require('./auth-route').fetchAndSyncGoogleSheet;
const reminder = require('./auth-route').reminder;
app.use('/auth', authRoute);

app.get('/', (req, res) => {
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

cron.schedule('* * * * *', async () => {
    console.log('⏳ Running Scheduled Task: Fetching Third Facebook Leads');
    await fetchAndSaveThirdFacebookLeads();
});

//Sync Google Sheet
// cron.schedule('* * * * *', async () => {
//     console.log("Running Google Sheet Sync...");
//     fetchAndSyncGoogleSheet();
// });

//Reminder

cron.schedule('* * * * *', async () => {
    console.log("Running Reminder.............");
    reminder();
});


// app.listen(port, () => {
//     console.log("Server Connected!!!!")
// });

server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
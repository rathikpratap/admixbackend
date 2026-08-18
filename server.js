require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const cron = require('node-cron');
// const sql = require('mssql');

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
// const fetchAndSaveFacebookLeads = require('./auth-route');

// Mount facebook webhook router
const fbWebhook = require('./fb-webhook');
app.use('/auth', fbWebhook);

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

//app.use(express.json());

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
    },
    transports: ['websocket']
});

// Make Socket.IO globally accessible
// global.io = io;

// io.on('connection', (socket) => {
//     console.log('🔌 Client connected:', socket.id);

//     socket.on('register-user', (username) =>{
//         socket.username = username;
//         socket.join(username);
//         console.log(`📌 ${username} joined their room`);
//     });

//     socket.on('snooze-reminder', async (data) => {
//         const { number, name } = data;
//         try {
//             const lead = await salesLead.findOne({ custName: name, custNumb: number });
//             if (lead) {
//                 const newReminderTime = new Date();
//                 newReminderTime.setMinutes(newReminderTime.getMinutes() + 15);
//                 lead.callReminderDate = newReminderTime;
//                 await lead.save();

//                 socket.emit('snooze-success', { message: `Reminder snoozed for 15 minutes.` });
//             } else {
//                 socket.emit('snooze-error', { message: `Lead not found.` });
//             }
//         } catch (err) {
//             socket.emit('snooze-error', { message: `Failed to snooze reminder.` });
//             console.error('Snooze error:', err);
//         }
//     });

//     socket.on('disconnect', () => {
//         console.log('❌ Client disconnected:', socket.id);
//     });
// });


global.io = io;


// const salesLead =
//   require('./models/salesLead');


/*
 * ================================
 * SOCKET CONNECTION
 * ================================
 */

io.on('connection', (socket) => {

  console.log(
    '🔌 Client connected:',
    socket.id
  );


  /*
   * USER REGISTER
   */

  socket.on(
    'register-user',
    async (username) => {

      try {

        if (!username) {

          console.warn(
            '⚠️ register-user without username'
          );
          console.log(`📌 ${username} joined their room`);

          return;
        }


        /*
         * Store username
         */

        socket.username =
          username;


        /*
         * Join salesperson room
         */

        socket.join(username);


        console.log(
          `📌 ${username} joined room`
        );

        console.log(
          `📌 Socket ID: ${socket.id}`
        );


        /*
         * ====================================
         * PENDING REMINDERS
         * ====================================
         *
         * Agar reminder ke time user offline tha
         * aur baad mein app open karta hai,
         * to pending reminder yahan bhejo.
         */

        const pendingReminders =
          await salesLead.find({

            salesPerson: username,

            callReminderDate: {
              $lte: new Date()
            },

            $or: [
              { reminderSent: false },
              {
                reminderSent: {
                  $exists: false
                }
              }
            ]

          });


        console.log(
          `🔎 Pending reminders for ${username}: ${pendingReminders.length}`
        );


        for (
          const lead
          of pendingReminders
        ) {

          socket.emit(
            'call-reminder',
            {

              _id:
                lead._id.toString(),

              name:
                lead.custName,

              number:
                lead.custNumb,

              time:
                lead.callReminderDate

            }
          );


          lead.reminderSent =
            true;


          await lead.save();


          console.log(
            `🔔 Pending reminder sent: ${lead.custName}`
          );

        }

      } catch (error) {

        console.error(
          '❌ register-user error:',
          error
        );

      }

    }
  );


  /*
   * ====================================
   * SNOOZE REMINDER
   * ====================================
   */

  socket.on(
    'snooze-reminder',
    async (data) => {

      try {

        const {
          _id
        } = data;


        if (!_id) {

          socket.emit(
            'snooze-error',
            {
              message:
                'Reminder ID is required.'
            }
          );

          return;
        }


        /*
         * Lead find
         */

        const lead =
          await salesLead.findById(_id);


        if (!lead) {

          socket.emit(
            'snooze-error',
            {
              message:
                'Lead not found.'
            }
          );

          return;
        }


        /*
         * Security:
         *
         * Check karo ki current socket
         * same salesperson ka hai.
         */

        if (
          lead.salesPerson &&
          socket.username &&
          lead.salesPerson !== socket.username
        ) {

          socket.emit(
            'snooze-error',
            {
              message:
                'You are not authorized for this reminder.'
            }
          );

          return;
        }


        /*
         * 15 minutes future
         */

        const newReminderTime =
          new Date(
            Date.now() +
            (15 * 60 * 1000)
          );


        lead.callReminderDate =
          newReminderTime;


        /*
         * Snooze ke baad dobara reminder
         * bhejna hai.
         */

        lead.reminderSent =
          false;


        await lead.save();


        console.log(
          `😴 Reminder snoozed for ${lead.custName}`
        );

        console.log(
          `⏰ New time: ${newReminderTime.toISOString()}`
        );


        socket.emit(
          'snooze-success',
          {

            message:
              'Reminder snoozed for 15 minutes.',

            time:
              newReminderTime

          }
        );


      } catch (error) {

        console.error(
          '❌ Snooze error:',
          error
        );


        socket.emit(
          'snooze-error',
          {
            message:
              'Failed to snooze reminder.'
          }
        );

      }

    }
  );


  /*
   * DISCONNECT
   */

  socket.on(
    'disconnect',
    (reason) => {

      console.log(
        '❌ Client disconnected:',
        socket.id,
        reason
      );

    }
  );

});

const authRoute = require('./auth-route');
// const fetchAndSaveFacebookLeads = require('./auth-route').fetchAndSaveFacebookLeads;
//const { fetchAndSaveFacebookLeads } = require('./auth-route');
//const fetchAndSaveSecondFacebookLeads = require('./auth-route').fetchAndSaveSecondFacebookLeads;
//const fetchAndSaveThirdFacebookLeads = require('./auth-route').fetchAndSaveThirdFacebookLeads;


//const fetchAndSyncGoogleSheet = require('./auth-route').fetchAndSyncGoogleSheet;
//---------------------------------------------------------------//
const {
  reminder
} = require('./middleware/reminder');
// const reminder = require('./auth-route').reminder;

// const { fetchAttendance } = require('./attendance-job');

// console.log("DEBUG fetchAttendance:", fetchAttendance);
// const fetchAttendance = require('./auth-route').fetchAttendance;
app.use('/auth', authRoute);

app.get('/', (req, res) => {
    res.send('Welcome Rathik')
});

// Run the job every 1 minute

// Schedule: every 5 minutes
// cron.schedule('*/5 * * * *', async () => {
//   console.log('⏳ Running Scheduled Task: Fetching Facebook Leads (every 5 min)');
//   try {
//     await fetchAndSaveFacebookLeads();
//   } catch (err) {
//     console.error('Scheduler error:', err);
//   }
// });

// If running as standalone server, keep process alive (this file can be launched with `node server.js`)
console.log('✅ Lead fetcher scheduled. Waiting for cron...');

// ✅ Run second job every 1 minutes
// cron.schedule('* * * * *', async () => {
//     console.log('⏳ Running Scheduled Task: Fetching Second Facebook Leads');
//     await fetchAndSaveSecondFacebookLeads();
// });

// cron.schedule('* * * * *', async () => {
//     console.log('⏳ Running Scheduled Task: Fetching Third Facebook Leads');
//     await fetchAndSaveThirdFacebookLeads();
// });

//Sync Google Sheet
// cron.schedule('* * * * *', async () => {
//     console.log("Running Google Sheet Sync...");
//     fetchAndSyncGoogleSheet();
// });

//Reminder

cron.schedule('* * * * *', async () => {
    console.log("Running Reminder Corn.............");
    // reminder();
    await reminder(io);
});

// cron.schedule("* * * * *", async () => {
//   console.log("⏳ Fetching attendance...");
//   await fetchAttendance();
// });
// app.listen(port, () => {
//     console.log("Server Connected!!!!")
// });

// const config = {
//   user: "sa",
//   password: "abc@123",
//   server: "127.0.0.1",
//   port: 1433,
//   database: "realtime",
//   options: {
//     encrypt: false,
//     trustServerCertificate: true
//   }
// };

// async function fetchAttendance2() {
//   try {
//     await sql.connect(config);

//     const result = await sql.query(`
//       SELECT TOP 50
//         cardno,
//         punchdatetime
//       FROM tran_machinerawpunch
//       ORDER BY punchdatetime DESC
//     `);

//     console.log(result.recordset);

//   } catch (err) {
//     console.error("Error:", err);
//   }
// }

// fetchAttendance2();

server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
});
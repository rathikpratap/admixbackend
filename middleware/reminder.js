const salesLead =
  require('../models/salesLead');


// const reminder = async (io) => {

//   try {

//     console.log(
//         '🔎 Reminder process PID:',
//         process.pid
//     );

//     const now = new Date();


//     const leads =
//       await salesLead.find({

//         callReminderDate: {
//           $lte: now
//         },

//         $or: [
//           {
//             reminderSent: false
//           },
//           {
//             reminderSent: {
//               $exists: false
//             }
//           }
//         ]

//       });


//     console.log(
//       `🔎 Reminder check: ${leads.length} pending`
//     );


//     for (const lead of leads) {

//       if (!lead.salesPerson) {
//         continue;
//       }


//       const sockets =
//         await io
//           .in(lead.salesPerson)
//           .fetchSockets();


//       /*
//        * User online nahi hai.
//        */

//       if (sockets.length === 0) {

//         console.log(
//           `👤 ${lead.salesPerson} offline`
//         );

//         continue;
//       }


//       /*
//        * Send reminder
//        */

//       io.to(
//         lead.salesPerson
//       ).emit(
//         'call-reminder',
//         {

//           _id:
//             lead._id.toString(),

//           name:
//             lead.custName,

//           number:
//             lead.custNumb,

//           time:
//             lead.callReminderDate

//         }
//       );


//       /*
//        * Prevent duplicate
//        */

//       lead.reminderSent =
//         true;


//       await lead.save();


//       console.log(
//         `🔔 Reminder sent: ${lead.custName}`
//       );

//     }

//   } catch (error) {

//     console.error(
//       'Reminder error:',
//       error
//     );

//   }

// };


// module.exports = {
//   reminder
// };

const reminder = async (io) => {

    try {

      console.log(
        '🔎 Reminder process PID:',
        process.pid
    );

        const now = new Date();

        const leads = await salesLead.find({
            callReminderDate: {
                $lte: now
            },
            $or: [
                { reminderSent: false },
                { reminderSent: { $exists: false } }
            ]
        });

        console.log(
            `🔎 Reminder check: ${leads.length} pending`
        );


        for (const lead of leads) {

            if (!lead.salesPerson) {
                continue;
            }


            const room =
                io.sockets.adapter.rooms.get(
                    lead.salesPerson
                );


            console.log(
                '===================================='
            );

            console.log(
                '👤 Employee:',
                lead.salesPerson
            );

            console.log(
                '🏠 Room:',
                lead.salesPerson
            );

            console.log(
                '👥 Room exists:',
                !!room
            );

            console.log(
                '👥 Room size:',
                room ? room.size : 0
            );

            console.log(
                '👤 Connected socket IDs:',
                room ? [...room] : []
            );


            if (!room || room.size === 0) {

                console.log(
                    `❌ ${lead.salesPerson} offline`
                );

                continue;
            }


            /*
             * Send reminder
             */

            io.to(lead.salesPerson).emit(
                'call-reminder',
                {
                    _id: lead._id.toString(),
                    name: lead.custName,
                    number: lead.custNumb,
                    time: lead.callReminderDate
                }
            );


            lead.reminderSent = true;

            await lead.save();


            console.log(
                `🔔 Reminder sent to ${lead.salesPerson}`
            );
        }

    } catch (error) {

        console.error(
            '❌ Reminder error:',
            error
        );
    }
};


module.exports = {
    reminder
};
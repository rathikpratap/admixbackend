// const moment = require("moment");
// const User = require('../models/user');

// async function processAttendance(records) {
//   console.log("⚙️ Processing attendance... START");

//   if (!records || records.length === 0) {
//     console.log("⚠️ No records found");
//   }

//   // 🔹 Step 1: Group punches
//   const grouped = {};

//   records.forEach(r => {
//     const date = moment(r.punchdatetime).format("YYYY-MM-DD");

//     if (!grouped[r.cardno]) grouped[r.cardno] = {};
//     if (!grouped[r.cardno][date]) grouped[r.cardno][date] = [];

//     grouped[r.cardno][date].push(new Date(r.punchdatetime));
//   });

//   console.log("👥 Employees with punches:", Object.keys(grouped).length);

//   // 🔹 Step 2: Get all users
//   const users = await User.find();

//   const today = moment().format("YYYY-MM-DD");
//   console.log("📅 Processing Date:", today);

//   for (const user of users) {
//     const cardno = user.cardNo;

//     if (!user.attendanceNew) user.attendanceNew = {};

//     const year = moment(today).format("YYYY");
//     const month = moment(today).format("MM");
//     const day = moment(today).format("DD");

//     // create structure
//     if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
//     if (!user.attendanceNew[year][month]) user.attendanceNew[year][month] = {};

//     // skip if already exists
//     const existing = user.attendanceNew?.[year]?.[month]?.[day];
//     if (existing) {
//       console.log(`⏭️ Already exists: ${user.signupName}`);
//       continue;
//     }

//     const punches = grouped[cardno]?.[today];

//     // ❌ ABSENT
//     if (!punches || punches.length === 0) {
//       console.log(`❌ Absent: ${user.signupName}`);

//       user.attendanceNew[year][month][day] = {
//         status: "Absent",
//         inTime: null,
//         outTime: null,
//         workHours: 0
//       };

//       await user.save();
//       continue;
//     }

//     // ✅ HAS PUNCH
//     const sorted = punches.sort((a, b) => a - b);

//     const firstPunch = sorted[0];
//     const lastPunch = sorted[sorted.length - 1];

//     console.log(`🕐 ${user.signupName} IN: ${firstPunch} OUT: ${lastPunch}`);

//     // ⚠️ Single punch
//     if (sorted.length === 1) {
//       console.log(`⚠️ Single punch: ${user.signupName}`);
//     }

//     const workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);

//     // 🔹 Late threshold = 10:30 AM
//     const lateThreshold = moment(firstPunch)
//       .set({ hour: 10, minute: 10, second: 0 });

//     let status = "Present";

//     // 🔥 Final logic
//     if (workHours < 6) {
//       status = "Half Day";
//     } else if (moment(firstPunch).isAfter(lateThreshold)) {
//       status = "Late";
//     }

//     console.log(`📌 Status: ${status}`);

//     user.attendanceNew[year][month][day] = {
//       status,
//       inTime: firstPunch,
//       outTime: lastPunch,
//       workHours: parseFloat(workHours.toFixed(2))
//     };

//     await user.save();
//     console.log(`✅ Saved: ${user.signupName}`);
//   }

//   console.log("🎉 Processing complete\n");
// }

// module.exports = { processAttendance };

// const moment = require("moment");
// const User = require('../models/user');

// async function processAttendance(records) {
//   console.log("⚙️ Processing attendance... START");

//   if (!records || records.length === 0) {
//     console.log("⚠️ No records found");
//   }

//   // 🔹 Step 1: Group punches
//   const grouped = {};

//   records.forEach(r => {
//     const date = moment(r.punchdatetime).format("YYYY-MM-DD");

//     if (!grouped[r.cardno]) grouped[r.cardno] = {};
//     if (!grouped[r.cardno][date]) grouped[r.cardno][date] = [];

//     grouped[r.cardno][date].push(new Date(r.punchdatetime));
//   });

//   console.log("👥 Employees with punches:", Object.keys(grouped).length);

//   // 🔹 Step 2: Get all users
//   const users = await User.find();

//   const today = moment().format("YYYY-MM-DD");
//   console.log("📅 Processing Date:", today);

//   for (const user of users) {
//     const cardno = user.cardNo;

//     if (!user.attendanceNew) user.attendanceNew = {};

//     const year = moment(today).format("YYYY");
//     const month = moment(today).format("MM");
//     const day = moment(today).format("DD");

//     // 🔹 Create structure
//     if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
//     if (!user.attendanceNew[year][month]) user.attendanceNew[year][month] = {};

//     // 🔹 Skip if already exists
//     const existing = user.attendanceNew?.[year]?.[month]?.[day];
//     if (existing) {
//       console.log(`⏭️ Already exists: ${user.signupName}`);
//       continue;
//     }

//     const punches = grouped[cardno]?.[today];

//     // ❌ ABSENT
//     if (!punches || punches.length === 0) {
//       console.log(`❌ Absent: ${user.signupName}`);

//       user.attendanceNew[year][month][day] = {
//         status: "Absent",
//         isLate: false,
//         inTime: null,
//         outTime: null,
//         workHours: 0
//       };

//       await user.save();
//       continue;
//     }

//     // ✅ HAS PUNCH
//     const sorted = punches.sort((a, b) => a - b);

//     const firstPunch = sorted[0];
//     const lastPunch = sorted[sorted.length - 1];

//     console.log(`🕐 ${user.signupName} IN: ${firstPunch} OUT: ${lastPunch}`);

//     // ⚠️ Single punch
//     const isSinglePunch = sorted.length === 1;
//     if (isSinglePunch) {
//       console.log(`⚠️ Single punch: ${user.signupName}`);
//     }

//     const workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);

//     // 🔹 Late threshold = 10:10 AM
//     const lateThreshold = moment(firstPunch).set({
//       hour: 10,
//       minute: 30,
//       second: 0
//     });

//     const isLate = moment(firstPunch).isAfter(lateThreshold);

//     // 🔹 Work status
//     let status = "Present";

//     if (isSinglePunch) {
//       status = "Half Day"; // ya "Absent" if you want strict
//     } else if (workHours < 6) {
//       status = "Half Day";
//     }

//     // 🔹 Combine Late + Status
//     let finalStatus = status;

//     if (isLate) {
//       finalStatus = `Late ${status}`;
//     }

//     console.log(`📌 Status: ${finalStatus}`);

//     user.attendanceNew[year][month][day] = {
//       status: finalStatus,
//       isLate: isLate,
//       inTime: firstPunch,
//       outTime: lastPunch,
//       workHours: parseFloat(workHours.toFixed(2))
//     };

//     await user.save();
//     console.log(`✅ Saved: ${user.signupName}`);
//   }

//   console.log("🎉 Processing complete\n");
// }

// module.exports = { processAttendance };

// const moment = require("moment");
// const User = require('../models/user');

// async function processAttendance(records) {
//   console.log("⚙️ Processing attendance... START");

//   if (!records || records.length === 0) {
//     console.log("⚠️ No records found");
//     return;
//   }

//   // 🔹 Step 1: Group punches (NO night shift logic)
//   const grouped = {};

//   records.forEach(r => {
//     const date = moment(r.punchdatetime).format("YYYY-MM-DD");

//     if (!grouped[r.cardno]) grouped[r.cardno] = {};
//     if (!grouped[r.cardno][date]) grouped[r.cardno][date] = [];

//     grouped[r.cardno][date].push(new Date(r.punchdatetime));
//   });

//   console.log("👥 Employees with punches:", Object.keys(grouped).length);

//   // 🔹 Step 2: Get all users
//   const users = await User.find();

//   for (const user of users) {
//     const cardno = user.cardNo;

//     if (!user.attendanceNew) user.attendanceNew = {};

//     // 👉 user ke saare dates (plus today for absent)
//     const userDates = grouped[cardno] ? Object.keys(grouped[cardno]) : [];

//     const today = moment().format("YYYY-MM-DD");
//     if (!userDates.includes(today)) {
//       userDates.push(today);
//     }

//     for (const date of userDates) {

//       const year = moment(date).format("YYYY");
//       const month = moment(date).format("MM");
//       const day = moment(date).format("DD");

//       // structure create
//       if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
//       if (!user.attendanceNew[year][month]) user.attendanceNew[year][month] = {};

//       const existing = user.attendanceNew?.[year]?.[month]?.[day];
//       if (existing) {
//         console.log(`⏭️ Already exists: ${user.signupName} (${date})`);
//         continue;
//       }

//       const punches = grouped[cardno]?.[date];

//       // ❌ ABSENT
//       if (!punches || punches.length === 0) {
//         console.log(`❌ Absent: ${user.signupName} (${date})`);

//         user.attendanceNew[year][month][day] = {
//           status: "Absent",
//           isLate: false,
//           inTime: null,
//           outTime: null,
//           workHours: 0
//         };

//         user.markModified('attendanceNew');
//         await user.save();
//         continue;
//       }

//       // ✅ HAS PUNCH
//       const sorted = punches.sort((a, b) => a - b);

//       const firstPunch = sorted[0];

//       let lastPunch = null;
//       let workHours = 0;

//       // ✔ only valid if 2+ punches
//       if (sorted.length >= 2) {
//         lastPunch = sorted[sorted.length - 1];
//         workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);
//       } else {
//         console.log(`⚠️ No OUT punch: ${user.signupName} (${date})`);
//       }

//       console.log(`🕐 ${user.signupName} (${date}) IN: ${firstPunch} OUT: ${lastPunch}`);

//       const isSinglePunch = sorted.length < 2;

//       // 🔹 Late threshold = 10:10 AM
//       const lateThreshold = moment(firstPunch).set({
//         hour: 10,
//         minute: 10,
//         second: 0
//       });

//       const isLate = moment(firstPunch).isAfter(lateThreshold);

//       // 🔹 Work status
//       let status = "Present";

//       if (isSinglePunch) {
//         status = "Half Day";
//       } else if (workHours < 6) {
//         status = "Half Day";
//       }

//       // 🔹 Combine Late
//       let finalStatus = status;
//       if (isLate) {
//         finalStatus = `Late ${status}`;
//       }

//       console.log(`📌 Status: ${finalStatus}`);

//       user.attendanceNew[year][month][day] = {
//         status: finalStatus,
//         isLate,
//         inTime: firstPunch,
//         outTime: lastPunch,
//         workHours: parseFloat(workHours.toFixed(2))
//       };

//       // 🔥 IMPORTANT FIX
//       user.markModified('attendanceNew');
//       await user.save();

//       console.log(`✅ Saved: ${user.signupName} (${date})`);
//     }
//   }

//   console.log("🎉 Processing complete\n");
// }

// module.exports = { processAttendance };

// const moment = require("moment");
// const User = require('../models/user');

// async function processAttendance(records) {
//   console.log("⚙️ Processing attendance... START");

//   if (!records || records.length === 0) {
//     console.log("⚠️ No records found");
//     return;
//   }

//   // 🔹 Step 1: Group punches strictly by date
//   const grouped = {};

//   records.forEach(r => {
//     const punchMoment = moment(r.punchdatetime);
//     const date = punchMoment.format("YYYY-MM-DD");

//     if (!grouped[r.cardno]) grouped[r.cardno] = {};
//     if (!grouped[r.cardno][date]) grouped[r.cardno][date] = [];

//     grouped[r.cardno][date].push(punchMoment.toDate());
//   });

//   console.log("👥 Employees with punches:", Object.keys(grouped).length);

//   const users = await User.find();

//   for (const user of users) {
//     const cardno = user.cardNo;

//     if (!user.attendanceNew) user.attendanceNew = {};

//     const userDates = grouped[cardno] ? Object.keys(grouped[cardno]) : [];

//     const today = moment().format("YYYY-MM-DD");
//     if (!userDates.includes(today)) {
//       userDates.push(today); // for absent marking
//     }

//     for (const date of userDates) {

//       const year = moment(date).format("YYYY");
//       const month = moment(date).format("MM");
//       const day = moment(date).format("DD");

//       if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
//       if (!user.attendanceNew[year][month]) user.attendanceNew[year][month] = {};

//       const existing = user.attendanceNew?.[year]?.[month]?.[day];
//       if (existing) {
//         console.log(`⏭️ Already exists: ${user.signupName} (${date})`);
//         continue;
//       }

//       let punches = grouped[cardno]?.[date];

//       // ❌ ABSENT
//       if (!punches || punches.length === 0) {
//         console.log(`❌ Absent: ${user.signupName} (${date})`);

//         user.attendanceNew[year][month][day] = {
//           status: "Absent",
//           isLate: false,
//           inTime: null,
//           outTime: null,
//           workHours: 0
//         };

//         user.markModified('attendanceNew');
//         await user.save();
//         continue;
//       }

//       // 🔥 IMPORTANT: filter same-day punches only
//       punches = punches.filter(p => {
//         return moment(p).format("YYYY-MM-DD") === date;
//       });

//       const sorted = punches.sort((a, b) => a - b);

//       const firstPunch = sorted[0];

//       let lastPunch = null;
//       let workHours = 0;

//       // ✅ only if same-day 2+ punches
//       if (sorted.length >= 2) {
//         lastPunch = sorted[sorted.length - 1];
//         workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);
//       } else {
//         console.log(`⚠️ No OUT punch: ${user.signupName} (${date})`);
//       }

//       console.log(`🕐 ${user.signupName} (${date}) IN: ${firstPunch} OUT: ${lastPunch}`);

//       const isSinglePunch = sorted.length < 2;

//       // 🔹 Late threshold = 10:10 AM
//       const lateThreshold = moment(firstPunch).set({
//         hour: 10,
//         minute: 10,
//         second: 0
//       });

//       const isLate = moment(firstPunch).isAfter(lateThreshold);

//       // 🔹 Work status
//       let status = "Present";

//       if (isSinglePunch) {
//         status = "Half Day";
//       } else if (workHours < 6) {
//         status = "Half Day";
//       }

//       // 🔹 Combine Late
//       let finalStatus = status;
//       if (isLate) {
//         finalStatus = `Late ${status}`;
//       }

//       console.log(`📌 Status: ${finalStatus}`);

//       user.attendanceNew[year][month][day] = {
//         status: finalStatus,
//         isLate,
//         inTime: firstPunch,
//         outTime: lastPunch,
//         workHours: parseFloat(workHours.toFixed(2))
//       };

//       user.markModified('attendanceNew');
//       await user.save();

//       console.log(`✅ Saved: ${user.signupName} (${date})`);
//     }
//   }

//   console.log("🎉 Processing complete\n");
// }

// module.exports = { processAttendance };

// const moment = require("moment");
// const User = require('../models/user');

// async function processAttendance(records) {
//   console.log("⚙️ Processing attendance... START");

//   if (!records || records.length === 0) {
//     console.log("⚠️ No records found");
//     return;
//   }

//   // 🔥 STEP 1: SORT RECORDS (VERY IMPORTANT)
//   records.sort((a, b) => new Date(a.punchdatetime) - new Date(b.punchdatetime));

//   // 🔥 STEP 2: GAP-BASED GROUPING (MAIN FIX)
//   const grouped = {};

//   records.forEach(r => {
//     const cardno = r.cardno;
//     const punchTime = new Date(r.punchdatetime);

//     if (!grouped[cardno]) grouped[cardno] = {};

//     const dates = Object.keys(grouped[cardno]);
//     let assignedDate;

//     if (dates.length === 0) {
//       assignedDate = moment(punchTime).format("YYYY-MM-DD");
//     } else {
//       const lastDate = dates[dates.length - 1];
//       const lastPunches = grouped[cardno][lastDate];
//       const lastPunch = lastPunches[lastPunches.length - 1];

//       const diffHours = (punchTime - lastPunch) / (1000 * 60 * 60);

//       // 🔥 KEY LOGIC: GAP CHECK
//       if (diffHours > 10) {
//         assignedDate = moment(punchTime).format("YYYY-MM-DD");
//       } else {
//         assignedDate = lastDate;
//       }
//     }

//     if (!grouped[cardno][assignedDate]) {
//       grouped[cardno][assignedDate] = [];
//     }

//     grouped[cardno][assignedDate].push(punchTime);
//   });

//   console.log("👥 Employees with punches:", Object.keys(grouped).length);

//   const users = await User.find();

//   for (const user of users) {
//     const cardno = user.cardNo;

//     if (!user.attendanceNew) user.attendanceNew = {};

//     const userDates = grouped[cardno] ? Object.keys(grouped[cardno]) : [];

//     // 👉 add today for absent
//     const today = moment().format("YYYY-MM-DD");
//     if (!userDates.includes(today)) {
//       userDates.push(today);
//     }

//     for (const date of userDates) {

//       const year = moment(date).format("YYYY");
//       const month = moment(date).format("MM");
//       const day = moment(date).format("DD");

//       if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
//       if (!user.attendanceNew[year][month]) user.attendanceNew[year][month] = {};

//       const existing = user.attendanceNew?.[year]?.[month]?.[day];
//       if (existing) {
//         console.log(`⏭️ Already exists: ${user.signupName} (${date})`);
//         continue;
//       }

//       const punches = grouped[cardno]?.[date];

//       // ❌ ABSENT
//       if (!punches || punches.length === 0) {
//         console.log(`❌ Absent: ${user.signupName} (${date})`);

//         user.attendanceNew[year][month][day] = {
//           status: "Absent",
//           isLate: false,
//           inTime: null,
//           outTime: null,
//           workHours: 0
//         };

//         user.markModified('attendanceNew');
//         await user.save();
//         continue;
//       }

//       const sorted = punches.sort((a, b) => a - b);

//       const firstPunch = sorted[0];

//       let lastPunch = null;
//       let workHours = 0;

//       // ✅ Only if 2+ punches
//       if (sorted.length >= 2) {
//         lastPunch = sorted[sorted.length - 1];
//         workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);
//       } else {
//         console.log(`⚠️ No OUT punch: ${user.signupName} (${date})`);
//       }

//       console.log(`🕐 ${user.signupName} (${date}) IN: ${firstPunch} OUT: ${lastPunch}`);

//       const isSinglePunch = sorted.length < 2;

//       // 🔹 Late threshold = 10:10 AM
//       const lateThreshold = moment(firstPunch).set({
//         hour: 10,
//         minute: 10,
//         second: 0
//       });

//       const isLate = moment(firstPunch).isAfter(lateThreshold);

//       // 🔹 Work status
//       let status = "Present";

//       if (isSinglePunch) {
//         status = "Half Day";
//       } else if (workHours < 6) {
//         status = "Half Day";
//       }

//       // 🔹 Combine Late
//       let finalStatus = status;
//       if (isLate) {
//         finalStatus = `Late ${status}`;
//       }

//       console.log(`📌 Status: ${finalStatus}`);

//       user.attendanceNew[year][month][day] = {
//         status: finalStatus,
//         isLate,
//         inTime: firstPunch,
//         outTime: lastPunch,
//         workHours: parseFloat(workHours.toFixed(2))
//       };

//       user.markModified('attendanceNew');
//       await user.save();

//       console.log(`✅ Saved: ${user.signupName} (${date})`);
//     }
//   }

//   console.log("🎉 Processing complete\n");
// }

// module.exports = { processAttendance };

// const moment = require("moment");
// const User = require('../models/user');

// async function processAttendance(records) {
//   console.log("⚙️ Processing attendance... START");

//   if (!records || records.length === 0) {
//     console.log("⚠️ No records found");
//     return;
//   }

//   // 🔹 STEP 1: Group by card + DATE (STRICT)
//   const grouped = {};

//   records.forEach(r => {
//     const cardno = r.cardno;
//     const punchTime = new Date(r.punchdatetime);
//     const date = moment(punchTime).format("YYYY-MM-DD");

//     if (!grouped[cardno]) grouped[cardno] = {};
//     if (!grouped[cardno][date]) grouped[cardno][date] = [];

//     grouped[cardno][date].push(punchTime);
//   });

//   const users = await User.find();

//   for (const user of users) {
//     const cardno = user.cardNo;

//     if (!user.attendanceNew) user.attendanceNew = {};

//     const userDates = grouped[cardno] ? Object.keys(grouped[cardno]) : [];

//     for (const date of userDates) {

//       const year = moment(date).format("YYYY");
//       const month = moment(date).format("MM");
//       const day = moment(date).format("DD");

//       if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
//       if (!user.attendanceNew[year][month]) user.attendanceNew[year][month] = {};

//       const existing = user.attendanceNew?.[year]?.[month]?.[day];
//       if (existing) continue;

//       let punches = grouped[cardno][date];

//       // 🔥 STRICT DATE FILTER (MOST IMPORTANT)
//       punches = punches.filter(p => 
//         moment(p).format("YYYY-MM-DD") === date
//       );

//       const sorted = punches.sort((a, b) => a - b);

//       const firstPunch = sorted[0];

//       let lastPunch = null;
//       let workHours = 0;

//       // ✅ ONLY SAME DAY punches
//     //   if (sorted.length >= 2) {
//     //     lastPunch = sorted[sorted.length - 1];
//     //     workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);
//     //   }

//     //   console.log(`🕐 ${user.signupName} (${date}) IN: ${firstPunch} OUT: ${lastPunch}`);
//     if (sorted.length >= 2) {
//   lastPunch = sorted[sorted.length - 1];

//   // ❗ EXTRA SAFETY (same punch avoid)
//   if (lastPunch.getTime() === firstPunch.getTime()) {
//     lastPunch = null;
//     workHours = 0;
//   } else {
//     workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);
//   }
// } else {
//   console.log(`⚠️ Only one punch → no OUT (${user.signupName} ${date})`);
// }
// console.log(`🕐 ${user.signupName} (${date}) IN: ${firstPunch} OUT: ${lastPunch}`);

//       // 🔹 Late check
//       const lateThreshold = moment(firstPunch).set({
//         hour: 10,
//         minute: 10,
//         second: 0
//       });

//       const isLate = moment(firstPunch).isAfter(lateThreshold);

//       // 🔹 Status
//       let status = "Present";

//       if (sorted.length < 2 || workHours < 6) {
//         status = "Half Day";
//       }

//       let finalStatus = status;
//       if (isLate) {
//         finalStatus = `Late ${status}`;
//       }

//       user.attendanceNew[year][month][day] = {
//         status: finalStatus,
//         isLate,
//         inTime: firstPunch,
//         outTime: lastPunch, // null if no OUT
//         workHours: parseFloat(workHours.toFixed(2))
//       };

//       user.markModified('attendanceNew');
//       await user.save();

//       console.log(`✅ Saved: ${user.signupName} (${date})`);
//     }
//   }

//   console.log("🎉 Processing complete\n");
// }

// module.exports = { processAttendance };

// const moment = require("moment");
// const User = require('../models/user');

// async function processAttendance(records) {
//   console.log("⚙️ Processing attendance... START");

//   if (!records || records.length === 0) {
//     console.log("⚠️ No records found");
//     return;
//   }

//   // 🔹 STEP 1: Group by card + date
//   const grouped = {};

//   records.forEach(r => {
//     const cardno = r.cardno;
//     // const punchTime = new Date(r.punchdatetime);
//     const punchTime = moment(r.punchdatetime).toDate();
//     const date = moment(punchTime).format("YYYY-MM-DD");

//     if (!grouped[cardno]) grouped[cardno] = {};
//     if (!grouped[cardno][date]) grouped[cardno][date] = [];

//     grouped[cardno][date].push(punchTime);
//   });

//   const users = await User.find();

//   for (const user of users) {
//     const cardno = user.cardNo;

//     if (!user.attendanceNew) user.attendanceNew = {};

//     const userDates = grouped[cardno] ? Object.keys(grouped[cardno]) : [];

//     // 👉 include today for absent case
//     const today = moment().format("YYYY-MM-DD");
//     if (!userDates.includes(today)) {
//       userDates.push(today);
//     }

//     for (const date of userDates) {

//       const year = moment(date).format("YYYY");
//       const month = moment(date).format("MM");
//       const day = moment(date).format("DD");

//       if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
//       if (!user.attendanceNew[year][month]) user.attendanceNew[year][month] = {};

//       let punches = grouped[cardno]?.[date] || [];

//       // 🔥 strict date filter
//       punches = punches.filter(p =>
//         moment(p).format("YYYY-MM-DD") === date
//       );

//       // ❌ ABSENT
//       if (punches.length === 0) {
//         console.log(`❌ Absent: ${user.signupName} (${date})`);

//         user.attendanceNew[year][month][day] = {
//           status: "Absent",
//           isLate: false,
//           inTime: null,
//           outTime: null,
//           workHours: 0
//         };

//         user.markModified('attendanceNew');
//         await user.save();
//         continue;
//       }

//       // 🔹 SORT punches
//       const sorted = punches.sort((a, b) => a - b);

//       const firstPunch = sorted[0];

//       let lastPunch = null;
//       let workHours = 0;

//       // ✅ OUT only if 2+ punches
//       if (sorted.length >= 2) {
//         lastPunch = sorted[sorted.length - 1];

//         // 🔥 same punch safety
//         if (lastPunch.getTime() === firstPunch.getTime()) {
//           lastPunch = null;
//         } else {
//           workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);
//         }
//       } else {
//         console.log(`⚠️ No OUT punch: ${user.signupName} (${date})`);
//       }

//       console.log(`🕐 ${user.signupName} (${date}) IN: ${firstPunch} OUT: ${lastPunch}`);

//       // 🔹 Late check
//       const lateThreshold = moment(firstPunch).set({
//         hour: 10,
//         minute: 30,
//         second: 0
//       });

//       const isLate = moment(firstPunch).isAfter(lateThreshold);

//       // 🔹 Status logic
//       let status = "Present";

//       if (sorted.length < 2 || workHours < 6) {
//         status = "Half Day";
//       }

//       let finalStatus = status;
//       if (isLate) {
//         finalStatus = `Late ${status}`;
//       }

//       console.log(`📌 Status: ${finalStatus}`);

//       // 🔥 ALWAYS UPDATE (no skip)
//       user.attendanceNew[year][month][day] = {
//         status: finalStatus,
//         isLate,
//         inTime: firstPunch,
//         outTime: lastPunch,
//         workHours: parseFloat(workHours.toFixed(2))
//       };

//       user.markModified('attendanceNew');
//       await user.save();

//       console.log(`✅ Saved/Updated: ${user.signupName} (${date})`);
//     }
//   }

//   console.log("🎉 Processing complete\n");
// }

// module.exports = { processAttendance };

const moment = require("moment");
const User = require("../models/user");

async function processAttendance(records) {
  console.log("⚙️ Processing attendance... START");

  if (!records || records.length === 0) {
    console.log("⚠️ No records found");
    return;
  }

  // 🔹 STEP 1: Group by card + date
  const grouped = {};

  records.forEach((r) => {
    const cardno = r.cardno;

    // 🔥 IMPORTANT: DO NOT USE new Date() directly
    const punchTime = moment(r.punchdatetime).toDate();
    const date = moment(punchTime).format("YYYY-MM-DD");

    if (!grouped[cardno]) grouped[cardno] = {};
    if (!grouped[cardno][date]) grouped[cardno][date] = [];

    grouped[cardno][date].push(punchTime);
  });

  const users = await User.find();

  for (const user of users) {
    const cardno = user.cardNo;

    if (!user.attendanceNew) user.attendanceNew = {};

    const userDates = grouped[cardno] ? Object.keys(grouped[cardno]) : [];

    // 👉 include today for absent
    const today = moment().format("YYYY-MM-DD");
    if (!userDates.includes(today)) {
      userDates.push(today);
    }

    for (const date of userDates) {
      const year = moment(date).format("YYYY");
      const month = moment(date).format("MM");
      const day = moment(date).format("DD");

      if (!user.attendanceNew[year]) user.attendanceNew[year] = {};
      if (!user.attendanceNew[year][month])
        user.attendanceNew[year][month] = {};

      let punches = grouped[cardno]?.[date] || [];

      // 🔥 Strict same-date filter
      punches = punches.filter(
        (p) => moment(p).format("YYYY-MM-DD") === date
      );

      // ❌ ABSENT
      if (punches.length === 0) {
        console.log(`❌ Absent: ${user.signupName} (${date})`);

        const existing = user.attendanceNew?.[year]?.[month]?.[day];

        if (existing?.isManual){
            console.log(`Skip manual Attendance: ${user.signupName}`);
            continue;
        }

        user.attendanceNew[year][month][day] = {
          status: "Absent",
          isLate: false,
          inTime: null,
          outTime: null,
          workHours: 0,
          isManual: false
        };

        user.markModified("attendanceNew");
        await user.save();
        continue;
      }

      // 🔹 SORT punches (safe)
      const sorted = punches.sort((a, b) => a.getTime() - b.getTime());

      const firstPunch = sorted[0];

      let lastPunch = null;
      let workHours = 0;

      // ✅ OUT only if 2+ punches
      if (sorted.length >= 2) {
        const candidate = sorted[sorted.length - 1];

        if (candidate.getTime() !== firstPunch.getTime()) {
          lastPunch = candidate;
          workHours = (lastPunch - firstPunch) / (1000 * 60 * 60);
        }
      } else {
        console.log(`⚠️ No OUT punch: ${user.signupName} (${date})`);
      }

      console.log(
        `🕐 ${user.signupName} (${date}) IN: ${firstPunch} OUT: ${lastPunch}`
      );

      // 🔥 FIXED LATE LOGIC (CLONE)
      const first = moment(firstPunch).utcOffset("+05:30");

      const lateThreshold = first.clone().set({
        hour: 10,
        minute: 30,
        second: 0,
      });

      const isLate = first.isAfter(lateThreshold);

      // 🔹 Status logic
      let status = "Present";

      if (sorted.length < 2 || workHours < 6) {
        status = "Half Day";
      }

      let finalStatus = status;

      if (isLate) {
        finalStatus = `Late ${status}`;
      }

      console.log(`📌 Status: ${finalStatus}`);

      const existing = user.attendanceNew?.[year]?.[month]?.[day];

        if (existing?.isManual) {
            console.log(`⏭️ Skip manual: ${user.signupName} (${date})`);
            continue;
        }

      // 🔥 ALWAYS UPDATE
      user.attendanceNew[year][month][day] = {
        status: finalStatus,
        isLate,
        inTime: firstPunch,
        outTime: lastPunch,
        workHours: parseFloat(workHours.toFixed(2)),
        isManual: false
      };

      user.markModified("attendanceNew");
      await user.save();

      console.log(`✅ Saved/Updated: ${user.signupName} (${date})`);
    }
  }

  console.log("🎉 Processing complete\n");
}

module.exports = { processAttendance };
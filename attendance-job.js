const sql = require('mssql');
const countersql = require("./models/countersql");
const moment = require("moment");
const { processAttendance } = require('./middleware/attendance');

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
const config ={
    user: 'sa',
    password: "Admixsql@1",
    server: "185.199.53.221",
    port: 1433,
    database: "attendance",
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function fetchAttendance() {
  console.log("🔥 FUNCTION CALLED");

  try {
    await sql.connect(config);

    // 🔹 Step 1: get lastFetchedTime from Mongo
    let setting = await countersql.findOne({ key: "lastFetchedTime" });

    let lastFetchedTime = setting?.value || null;

    console.log("⏱ LastFetchedTime:", lastFetchedTime);

    // 🔹 Step 2: build query
    let query = `
      SELECT cardno, punchdatetime
      FROM tran_machinerawpunch
    `;

    if (lastFetchedTime) {
      query += ` WHERE punchdatetime > '${moment(lastFetchedTime).utc().format("YYYY-MM-DD HH:mm:ss")}'`;
    }

    query += ` ORDER BY punchdatetime ASC`;

    const result = await sql.query(query);

    console.log(`📦 Records fetched: ${result.recordset.length}`);

    if (result.recordset.length === 0) return;

    // 🔹 Step 3: process
    await processAttendance(result.recordset);

    // 🔹 Step 4: update lastFetchedTime
    const latestTime = result.recordset[result.recordset.length - 1].punchdatetime;

    if (setting) {
      setting.value = latestTime;
      await setting.save();
    } else {
      await countersql.create({
        key: "lastFetchedTime",
        value: latestTime
      });
    }

    console.log("✅ Updated lastFetchedTime:", latestTime);

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

// async function fetchAttendance() {
//   console.log("🔥 FUNCTION CALLED");

//   try {
//     console.log('fetchAttendance START');

//     await sql.connect(config);
//     console.log('SQL Connected');

//     const result = await sql.query(`
//       SELECT cardno, punchdatetime
//       FROM tran_machinerawpunch
//       WHERE punchdatetime >= DATEADD(DAY, -1, GETDATE())
//       ORDER BY punchdatetime ASC
//     `);

//     console.log(`📦 Records fetched: ${result.recordset.length}`);

//     await processAttendance(result.recordset);

//     console.log('fetchAttendance DONE');

//   } catch (err) {
//     console.error("❌ Error:", err);
//   }
// }

module.exports = { fetchAttendance };
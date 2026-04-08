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

        if (existing?.isManual) {
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

      const inTimeIST = moment(firstPunch).format("YYYY-MM-DD hh:mm A");

      const outTimeIST = lastPunch
        ? moment(lastPunch).format("YYYY-MM-DD hh:mm A")
        : "N/A";

      console.log(
        `👤 ${user.signupName} | 📅 ${date} | IN: ${inTimeIST} | OUT: ${outTimeIST}`
      );

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
      // const first = moment(firstPunch).utcOffset("+05:30");
      const first = moment(firstPunch).utc();

      // const lateThreshold = first.clone().set({
      //   hour: 10,
      //   minute: 30,
      //   second: 0,
      // });

      const lateThreshold = moment(firstPunch).utc().startOf("day").add(10, "hours").add(30, "minutes");

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

      console.log(
        `📦 ${user.signupName} punches:`,
        punches.map(p => moment(p).format("YYYY-MM-DD HH:mm:ss"))
      );

      // user.markModified("attendanceNew");
      // await user.save();

      console.log(`✅ Saved/Updated: ${user.signupName} (${date})`);
    }
      user.markModified("attendanceNew");
      await user.save();
  }

  console.log("🎉 Processing complete\n");
}

module.exports = { processAttendance };
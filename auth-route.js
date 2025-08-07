const router = require('express').Router();
const { google } = require('googleapis');
const fs = require('fs');
const FbAccessToken = require('./models/accessToken');
const newCompany = require('./models/company');
const B2bCustomer = require('./models/b2bProjects');
const User = require('./models/user');
const Customer = require('./models/newcustomer');
const WhatsAppCategory = require('./models/whatsAppCategory');
const Subsidiary = require('./models/subsidiary');
const ClosingCategory = require('./models/closingCategory');
const newSalesTeam = require("./models/newSalesTeam");
const Lead = require('./models/Leads');
const Task = require('./models/task');
const salesLead = require('./models/salesLead');
const incentive = require('./models/incentive');
const point = require('./models/points');
const transferLead = require('./models/adminLeads');
const Payroll = require('./models/payroll');
const CampaignAssignment = require('./models/campaignAssignment');
const EstInvoice = require('./models/estInvoice');
const Notification = require('./models/notification');
const { Country, State, City } = require('country-state-city');
//const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const checkAuth = require('./middleware/chech-auth');
const axios = require('axios');
const multer = require('multer');
const XLSX = require('xlsx');
const { sendNotif, sendCampaignNotif } = require('./middleware/sendNotif');
// const sendCampaignNotif = require('./middleware/sendNotif');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const moment = require('moment');
const momment = require('moment-timezone');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
//const {io} = require('./server');
const io = global.io;
const path = require('path');
const { format } = require('date-fns');

const MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const SCOPES = [MESSAGING_SCOPE];

let person = '';
let personTeam = '';
let role = '';

router.post('/register', async (req, res) => {
  const user = new User({
    signupName: req.body.signupName,
    signupUsername: req.body.signupUsername,
    signupEmail: req.body.signupEmail,
    signupNumber: req.body.signupNumber,
    signupGender: req.body.signupGender,
    signupPassword: req.body.signupPassword,
    signupAddress: req.body.signupAddress,
    signupRole: req.body.signupRole,
    signupPayment: req.body.signupPayment,
    salesTeam: req.body.salesTeam,
    subsidiaryName: req.body.subsidiaryName,
    incentivePassword: req.body.incentivePassword,
    editorType: req.body.editorType
  })
  await user.save()
    .then((_) => {
      res.json({ success: true, message: "Account has been created!!" })
    })
    .catch((err) => {
      if (err.code === 11000) {
        return res.json({ success: false, message: "Data Already Match" })
      }
      res.json({ success: false, message: "Authentication Failed" })
    });
});

// OTP sending

const otpStore = {};

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'itwebdeveloper47@gmail.com',
//     pass: 'sjlx jxmt cjbc gatr'
//   }
// });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'admixmediaindia@gmail.com',
    pass: 'ddvu kfjl anyo tcnr'
  }
});

router.post('/send-otp', async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ signupUsername: username });

  if (!user) {
    return res.json({ success: false, message: "User not found!" });
  }

  const isAdmin = Array.isArray(user.signupRole) && user.signupRole.includes("Admin");
  const now = momment().tz("Asia/Kolkata");

  // Restrict time if not admin
  if (!isAdmin) {
    //const now = momment().tz("Asia/Kolkata");
    const hour = now.hour();
    const minute = now.minute();

    const beforeStart = hour < 9 || (hour === 9 && minute < 30);
    const afterEnd = hour > 19 || (hour === 19 && minute > 30);

    if (beforeStart || afterEnd) {
      return res.json({
        success: false,
        message: "OTP requests allowed only between 9:30 AM and 7:30 PM IST"
      });
    }

    // Check if already logged in today
    // if (user.lastOTPLogin && momment(user.lastOTPLogin).isSame(now, 'day')) {
    //   return res.json({
    //     success: false,
    //     message: "OTP already used today. Login not required again."
    //   });
    // }

    if (user.lastOTPLogin && moment(user.lastOTPLogin).isSame(now, 'day')) {
      const payload = {
        userId: user._id,
        name: user.signupUsername,
        Saleteam: user.salesTeam,
        signupRole: user.signupRole
      };

      const token = jwt.sign(payload, "webBatch", { expiresIn: '8h' });

      return res.json({
        success: true,
        token,
        role: user.signupRole,
        team: user.salesTeam,
        name: user.signupUsername,
        message: "Already logged in today. Redirecting...",
        isAdmin: false  // treat like normal user
      });
    }

    if (user.lastOTPSent && momment().diff(user.lastOTPSent, 'minutes') < 1) {
      return res.json({ success: false, message: 'Please wait before requesting another OTP.' });
    }
  }

  if (!isAdmin) {
    const otp = crypto.randomInt(100000, 999999);
    otpStore[username] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    await transporter.sendMail({
      from: 'admixmediaindia@gmail.com',
      to: user.signupEmail,
      subject: 'Your OTP for Login',
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`
    });

    user.lastOTPSent = now.toDate();
    await user.save();
  }

  return res.json({
    success: true,
    message: isAdmin ? "Admin login, OTP not required" : "OTP sent successfully!",
    isAdmin
  });
});

// Login Bellow

router.post('/login', async (req, res) => {
  const { username, otp } = req.body;

  const user = await User.findOne({ signupUsername: username });
  if (!user) return res.json({ success: false, message: "User not found!" });

  const isAdmin = Array.isArray(user.signupRole) && user.signupRole.includes("Admin");

  if (!isAdmin) {
    const stored = otpStore[username];
    if (!stored || stored.expiresAt < Date.now()) {
      return res.json({ success: false, message: "OTP expired or invalid!" });
    }

    if (parseInt(otp) !== stored.otp) {
      return res.json({ success: false, message: "Incorrect OTP!" });
    }

    delete otpStore[username];

    // ✅ Save login time
    user.lastOTPLogin = new Date();
    await user.save();
  }

  const payload = {
    userId: user._id,
    name: user.signupUsername,
    Saleteam: user.salesTeam,
    signupRole: user.signupRole
  };

  const token = jwt.sign(payload, "webBatch", { expiresIn: '8h' });

  res.json({
    success: true,
    token,
    role: user.signupRole,
    team: user.salesTeam,
    message: "Login successful!"
  });
});

//impersonate User

router.post('/impersonate', async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user to impersonate by their ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate a new token for impersonation
    const token = jwt.sign(
      { userId: user._id, name: user.signupUsername, signupRole: user.signupRole, saleTeam: user.salesTeam },
      "webBatch", // Use a strong secret key
      { expiresIn: '8h' }
    );

    // Send the token and roles back to the frontend
    res.json({
      success: true,
      token,
      role: user.signupRole,
      team: user.salesTeam // Assuming you have a team field
    });
  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//Logout

router.post('/logout', (req, res) => {
  const token = req.headers.authorization.split(' ')[1]; // Assumes token is in the format "Bearer <token>"

  // Verify JWT token
  jwt.verify(token, "webBatch", (err, decoded) => {
    if (err) {
      return res.json({ success: false, message: "Invalid token." });
    }

    const userId = decoded.userId;

    User.findById(userId).exec()
      .then(user => {
        if (!user) {
          return res.json({ success: false, message: "User not found!" });
        }

        const lastSession = user.loginSessions.find(session => !session.logoutTime);
        if (lastSession) {
          // Save the current logout time
          lastSession.logoutTime = new Date();

          // Save the updated user document
          user.save()
            .then(() => {
              return res.json({
                success: true,
                message: "Logout Successful"
              });
            })
            .catch(err => {
              console.error("Error saving logout time: ", err);
              return res.json({ success: false, message: "Failed to save logout time." });
            });
        } else {
          return res.json({ success: false, message: "No active session found to log out." });
        }
      })
      .catch(err => {
        console.error("Error during logout: ", err);
        res.json({ success: false, message: "Logout Failed" });
      });
  });
});

router.get('/profile', checkAuth, async (req, res) => {
  const userId = await req.userData.userId;
  person = req.userData.name;
  personTeam = req.userData.Saleteam;

  console.log("PERSON TEAMMMMMMMMMMMMMM======>>", personTeam);
  // role = req.userData.signupRole;
  role = Array.isArray(req.userData.signupRole) ? req.userData.signupRole[0] : req.userData.signupRole;

  User.findById(userId).exec().then((result) => {
    return res.json({ success: true, data: result })
  }).catch(err => {
    res.json({ success: false, message: "Server Error!!" })
  })
});

// Monthwise Ongoing Projects

router.get('/list', checkAuth, async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const person1 = req.userData?.name;
    const products = await Customer.find({
      salesPerson: person1,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      },
      projectStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });

    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//All ongoing Projects Sales

router.get('/allList', checkAuth, async (req, res) => {
  try {
    const person1 = req.userData?.name;
    const products = await Customer.find({
      salesPerson: person1,
      projectStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });

    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// All ongoing projects Admin

router.get('/allListAdmin', async (req, res) => {
  try {
    const products = await Customer.find({
      projectStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });

    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Table Database Closed

router.get('/completeProject', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const completeProducts = await Customer.find({
      salesPerson: person,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      projectStatus: { $regex: /^Completed$/i }
    }).sort({ closingDate: -1 });

    if (completeProducts.length > 0) {
      res.json(completeProducts);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allProjects', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const fetchedLeads = await Customer.find({
      salesPerson: person,
      closingDate: {
        $gte: startOfMonth,
        $lte: endOfToday
      }
    }).sort({ closingDate: -1 });

    return res.json(fetchedLeads);
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' });
  }
});


// all previous Month projects

router.get('/allPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const previousMonthData = await Customer.find({
      salesPerson: person,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ closingDate: -1 });
    return res.json(previousMonthData);
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

//all Previous Two Month Data

router.get('/allTwoPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const previousTwoMonthData = await Customer.find({
      salesPerson: person,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ closingDate: -1 });
    return res.json(previousTwoMonthData);
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

// All Projects Admin

router.get('/allProjectsAdmin', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      }
    }).sort({ closingDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

//all previous Month projects Admin

router.get('/allPreviousProjectsAdmin', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const previousMonthData = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ closingDate: -1 });
    return res.json(previousMonthData)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

//all previous Two Month projects Admin

router.get('/allTwoPreviousProjectsAdmin', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const previousTwoMonthData = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 1)
      }
    }).sort({ closingDate: -1 });
    return res.json(previousTwoMonthData)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

//database Length

router.get('/dataLength', async (req, res) => {
  const dataLength = await Customer.countDocuments();
  return res.json(dataLength);
});

// All Employees

router.get('/allEmployee', async (req, res) => {
  const allEmployee = await User.find();
  if (allEmployee) {
    return res.json(allEmployee)
  } else {
    res.send({ result: "No Users Found" })
  }
});

//All Monthwise Ongoing Projects Admin

router.get('/allOngoingProjects', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      },
      projectStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });

    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allOngoingProjectsExcludingLogo', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      },
      closingCateg: { $nin: ['Logo Design', 'Logo Animation'] },
      projectStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });

    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allOngoingProjectsIncludingLogo', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      },
      closingCateg: { $in: ['Logo Design', 'Logo Animation'] },
      projectStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });

    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// All Production Projects

router.get('/allProductionProjects', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      },
      projectStatus: { $in: ['Video Editing', 'Video Changes'] }
    }).sort({ closingDate: -1 });
    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//All Complete projects

router.get('/allCompleteProjects', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const completeProducts = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
      },
      remainingAmount: { $eq: 0 },
      projectStatus: { $regex: /^Completed$/i }
    }).sort({ closingDate: -1 });

    if (completeProducts.length > 0) {
      res.json(completeProducts);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//get Customer

// router.get('/read-cust/:id', async (req, res) => {
//   try {
//     // Search in the Customer collection
//     const customerDetails = await Customer.findById(req.params.id);

//     // Search in other collections, for example, OtherCollection
//     const otherDetails = await salesLead.findById(req.params.id);

//     // Check if any data found in either collection
//     if (customerDetails) {
//       return res.json(customerDetails);
//     } else if (otherDetails) {
//       return res.json(otherDetails);
//     } else {
//       return res.json({ result: "No Data" });
//     }
//   } catch (error) {
//     return res.status(500).json({ error: error.message });
//   }
// });

router.get('/read-cust/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find in main Customer collection
    const customerDetails = await Customer.findById(id);
    if (customerDetails) {
      return res.json(customerDetails);
    }

    // Try to find in salesLead collection
    const otherDetails = await salesLead.findById(id);
    if (otherDetails) {
      return res.json(otherDetails);
    }

    // Check subEntries in Customer collection
    const allCustomers = await Customer.find({});
    for (const doc of allCustomers) {
      const subEntry = (doc.subEntries || []).find(sub => sub._id.toString() === id);
      if (subEntry) {
        return res.json({
          ...subEntry,
          parentId: doc._id,
          parentCustCode: doc.custCode,
          parentEntryType: 'Customer'
        });
      }
    }

    // Optionally: Check subEntries in salesLead (if applicable)
    const allLeads = await salesLead.find({});
    for (const doc of allLeads) {
      const subEntry = (doc.subEntries || []).find(sub => sub._id.toString() === id);
      if (subEntry) {
        return res.json({
          ...subEntry,
          parentId: doc._id,
          parentEntryType: 'salesLead'
        });
      }
    }

    return res.json({ result: "No Data" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


//get Employee

router.get('/read-emp/:id', async (req, res) => {
  try {
    const empDetails = await User.findById(req.params.id);
    if (empDetails) {
      return res.json(empDetails);
    } else {
      return res.json({ result: "No Employee Found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

//read company

router.get('/getCompanyPay/:id', async (req, res) => {
  try {
    const compDetails = await newCompany.findById(req.params.id);
    if (compDetails) {
      return res.json(compDetails);
    } else {
      return res.json({ result: "No Company Found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// delete Emp

router.delete('/delete-emp/:id', async (req, res) => {
  try {
    const deleteData = await User.findByIdAndDelete(req.params.id);
    if (deleteData) {
      return res.json(deleteData);
    } else {
      return res.json({ result: "No Data Deleted" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete Customers

router.delete('/delete-cust/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.json({ result: "No Data Deleted" });
    }

    // Generate sheet name from closingDate
    const closingDate = customer.closingDate ? new Date(customer.closingDate) : null;
    if (!closingDate) return res.json({ message: "Customer deleted from DB, but no closing date found" });

    const sheetName = `${closingDate.toLocaleString('en-US', { month: 'long' })} ${closingDate.getFullYear()}`;

    // Delete from Google Sheets
    const success = await deleteCustomerFromGoogleSheet(sheetName, customer.custCode);

    if (success) {
      return res.json({ message: "Customer deleted from database and Google Sheets", customer });
    } else {
      return res.json({ message: "Customer deleted from database, but not found in Google Sheets", customer });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const deleteCustomerFromGoogleSheet = async (sheetName, custCode) => {
  try {
    // Fetch data from the correct sheet
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet_id,
      range: `${sheetName}!A:Z` // Fetch all rows
    });

    let rows = sheetData.data.values;
    if (!rows || rows.length === 0) return false;

    // Find the row index where custCode matches
    let rowIndex = rows.findIndex(row => row[0] === custCode);
    if (rowIndex === -1) return false;

    // Google Sheets API uses 1-based index (1st row is index 1)
    rowIndex += 1;

    // Delete the row using batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheet_id,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: await getSheetId(sheetName), // Get dynamic sheet ID
              dimension: "ROWS",
              startIndex: rowIndex - 1,
              endIndex: rowIndex
            }
          }
        }]
      }
    });

    console.log(`Customer with Code ${custCode} deleted from Google Sheet: ${sheetName}`);
    return true;
  } catch (error) {
    console.error("Error deleting from Google Sheets:", error);
    return false;
  }
};

const getSheetId = async (sheetName) => {
  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId: sheet_id });

    const sheet = response.data.sheets.find(sheet => sheet.properties.title === sheetName);
    return sheet ? sheet.properties.sheetId : null;
  } catch (error) {
    console.error("Error retrieving sheet ID:", error);
    return null;
  }
};


// delete SalesLead

router.delete('/delete-sales/:id', async (req, res) => {
  try {
    const deleteCust = await salesLead.findByIdAndDelete(req.params.id);
    if (deleteCust) {
      return res.json(deleteCust);
    } else {
      return res.json({ result: "No Data Deleted" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Edit Customer Details By editor

// router.put('/updateEditor/:id', async (req, res) => {
//   const custDet = await Customer.findByIdAndUpdate(req.params.id, {
//     $set: req.body
//   })
//   if (custDet) {
//     return res.json(custDet)
//   } else {
//     res.send({ result: "No No Data" })
//   }
// });

router.put('/updateEditor/:id', async (req, res) => {
  try {
    // First try to update main document (if ID matches _id of a main entry)
    const updatedMain = await Customer.findByIdAndUpdate(req.params.id, {
      $set: req.body
    }, { new: true });

    if (updatedMain) {
      return res.json({ updated: 'main', data: updatedMain });
    }

    // If not found in main, try to find parent document that has the sub-entry
    const parentDoc = await Customer.findOne({ "subEntries._id": req.params.id });

    if (!parentDoc) {
      return res.status(404).json({ error: "Sub-entry or main entry not found" });
    }

    // Find sub-entry index
    const subIndex = parentDoc.subEntries.findIndex(sub => sub._id.toString() === req.params.id);
    if (subIndex === -1) {
      return res.status(404).json({ error: "Sub-entry not found inside parent" });
    }

    // Merge existing sub-entry data with updates
    parentDoc.subEntries[subIndex] = {
      ...parentDoc.subEntries[subIndex]._doc,
      ...req.body
    };

    // Save the whole parent document after sub-entry update
    const updatedParent = await parentDoc.save();

    return res.json({ updated: 'sub-entry', data: updatedParent.subEntries[subIndex] });
  } catch (error) {
    console.error("Error updating:", error);
    return res.status(500).json({ error: error.message });
  }
});


// Edit Customer Details

router.put('/update/:id', checkAuth, async (req, res) => {
  try {
    const person1 = req.userData.name;
    const personTeam1 = req.userData.Saleteam;

    let custDet = await Customer.findById(req.params.id);
    let leadDet = await salesLead.findById(req.params.id);

    if (custDet) {
      custDet = await Customer.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });

      // Update in Google Sheets
      const sheetUpdated = await updateCustomerInGoogleSheet(custDet);

      return res.json({ custDet, sheetUpdated });
    }
    else if (leadDet) {
      if (req.body.projectStatus === 'Not Interested') {
        leadDet = await salesLead.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        return res.json(leadDet);
      } else {
        // Convert lead to customer
        const newCustomer = new Customer({
          _id: leadDet._id,
          custCode: req.body.custCode,
          custName: leadDet.custName,
          custNumb: leadDet.custNumb,
          custNumb2: req.body.custNumb2,
          custEmail: leadDet.custEmail,
          custBussiness: leadDet.custBussiness,
          closingDate: req.body.closingDate,
          leadsCreatedDate: leadDet.closingDate,
          closingPrice: req.body.closingPrice,
          closingCateg: req.body.closingCateg,
          billType: req.body.billType,
          AdvPay: req.body.AdvPay,
          remainingAmount: req.body.remainingAmount,
          custCountry: req.body.custCountry,
          custCity: req.body.custCity,
          custState: req.body.custState,
          projectStatus: req.body.projectStatus,
          youtubeLink: req.body.youtubeLink,
          restAmount: req.body.restAmount,
          restPaymentDate: req.body.restPaymentDate,
          remark: req.body.remark,
          salesPerson: person1,
          salesTeam: personTeam1,
          graphicDesigner: req.body.graphicDesigner,
          editor: req.body.editor,
          scriptWriter: req.body.scriptWriter,
          voiceOver: req.body.voiceOver,
          wordsCount: req.body.wordsCount,
          scriptDuration: req.body.scriptDuration,
          script: req.body.script,
          scriptDeliveryDate: req.body.scriptDeliveryDate,
          scriptStatus: req.body.scriptStatus,
          scriptPayment: req.body.scriptPayment,
          scriptOtherChanges: req.body.scriptOtherChanges,
          scriptChangesPayment: req.body.scriptChangesPayment,
          videoDuration: req.body.videoDuration,
          videoDeliveryDate: req.body.videoDeliveryDate,
          videoType: req.body.videoType,
          editorStatus: req.body.editorStatus,
          editorPayment: req.body.editorPayment,
          editorOtherChanges: req.body.editorOtherChanges,
          editorChangesPayment: req.body.editorChangesPayment,
          voiceDuration: req.body.voiceDuration,
          voiceDeliveryDate: req.body.voiceDeliveryDate,
          voiceOverType: req.body.voiceOverType,
          voiceOverStatus: req.body.voiceOverStatus,
          voicePayment: req.body.voicePayment,
          voiceOtherChanges: req.body.voiceOtherChanges,
          voiceChangesPayment: req.body.voiceChangesPayment,
          totalEditorPayment: req.body.totalEditorPayment,
          totalScriptPayment: req.body.totalScriptPayment,
          totalVoicePayment: req.body.totalVoicePayment,
          videoDurationMinutes: req.body.videoDurationMinutes,
          videoDurationSeconds: req.body.videoDurationSeconds,
          voiceDurationMinutes: req.body.voiceDurationMinutes,
          voiceDurationSeconds: req.body.voiceDurationSeconds,
          scriptDurationMinutes: req.body.scriptDurationMinutes,
          scriptDurationSeconds: req.body.scriptDurationSeconds,
          numberOfVideos: req.body.numberOfVideos,
          companyName: req.body.companyName,
          scriptPassDate: req.body.scriptPassDate,
          Qr: req.body.Qr,
          customerType: req.body.customerType
        });

        await newCustomer.save();
        await salesLead.findByIdAndDelete(req.params.id);

        // Add new customer to Google Sheets
        const sheetUpdated = await updateCustomerInGoogleSheet(newCustomer);

        return res.json({ newCustomer, sheetUpdated });
      }
    } else {
      return res.json({ result: "No Data" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const updateCustomerInGoogleSheet = async (customer) => {
  try {
    if (!customer.closingDate) return false;

    // Determine Sheet Tab Name
    const closingDate = new Date(customer.closingDate);
    const sheetName = `${closingDate.toLocaleString('en-US', { month: 'long' })} ${closingDate.getFullYear()}`;

    // Get all sheet names
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: sheet_id
    });

    const sheetTitles = sheetMetadata.data.sheets.map(sheet => sheet.properties.title);

    // If the sheet doesn't exist, create it
    if (!sheetTitles.includes(sheetName)) {
      await createNewSheetWithHeaders(sheetName);
    }

    // Fetch existing data from the correct sheet tab
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet_id,
      range: `${sheetName}!A:Z`
    });

    let rows = sheetData.data.values;
    if (!rows || rows.length === 0) return false;

    // Find the row index where custCode matches
    let rowIndex = rows.findIndex(row => row[0] === customer.custCode);
    if (rowIndex === -1) {
      // If customer is not found, add a new row
      return await appendToGoogleSheet2(customer, sheetName);
    } else {
      rowIndex += 1; // Convert to 1-based index
    }

    // New updated values
    const values = [[
      customer.custCode,
      customer.custName,
      customer.custNumb,
      customer.custNumb2 || "",
      customer.custBussiness,
      customer.closingDate ? customer.closingDate.toISOString() : "",
      customer.closingPrice || "",
      customer.closingCateg || "",
      customer.billType || "",
      customer.Qr || "",
      customer.AdvPay || "",
      customer.remainingAmount || "",
      customer.restAmount || "",
      customer.restPaymentDate ? customer.restPaymentDate.toISOString() : "",
      customer.customerType,
      customer.custCountry || "",
      customer.custState || "",
      customer.custCity || "",
      customer.projectStatus || "",
      customer.salesPerson || "",
      customer.remark || ""
    ]];

    // Update row in Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheet_id,
      range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      resource: { values }
    });

    console.log(`Customer ${customer.custCode} updated in ${sheetName}`);
    return true;
  } catch (error) {
    console.error("Error updating customer in Google Sheets:", error);
    return false;
  }
};
const createNewSheetWithHeaders = async (sheetName) => {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheet_id,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: sheetName }
          }
        }]
      }
    });

    // Add headers to the new sheet
    const headers = [[
      "Code", "Name", "Number 1", "Number 2", "Business", "Closing Date", "Closing Price",
      "Closing Category", "Bill Type", "Qr Code", "Advance Payment", "Remaining Amount",
      "Rest Amount", "Rest Amount Date", "Customer Type", "Country", "State", "City", "Project Status",
      "Sales Person", "Remark"
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheet_id,
      range: `${sheetName}!A1:Z1`,
      valueInputOption: "USER_ENTERED",
      resource: { values: headers }
    });

    console.log(`Created new sheet: ${sheetName} with headers.`);
  } catch (error) {
    console.error("Error creating new sheet:", error);
  }
};
const appendToGoogleSheet2 = async (customer, sheetName) => {
  try {
    const values = [[
      customer.custCode,
      customer.custName,
      customer.custNumb,
      customer.custNumb2 || "",
      customer.custBussiness,
      customer.closingDate ? new Date(customer.closingDate).toLocaleDateString('en-GB') : "",
      customer.closingPrice || "",
      customer.closingCateg || "",
      customer.billType || "",
      customer.Qr || "",
      customer.AdvPay || "",
      customer.remainingAmount || "",
      customer.restAmount || "",
      customer.restPaymentDate ? new Date(customer.restPaymentDate).toLocaleDateString('en-GB') : "",
      customer.customerType,
      customer.custCountry || "",
      customer.custState || "",
      customer.custCity || "",
      customer.projectStatus || "",
      customer.salesPerson || "",
      customer.remark || ""
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheet_id,
      range: `${sheetName}!A:Z`,
      valueInputOption: "USER_ENTERED",
      resource: { values }
    });

    console.log(`Customer ${customer.custCode} added to ${sheetName}`);
    return true;
  } catch (error) {
    console.error("Error adding data to Google Sheet:", error);
    return false;
  }
};

// Edit Employee

router.put('/updateEmp/:id', async (req, res) => {
  const EmpDet = await User.findByIdAndUpdate(req.params.id, {
    $set: req.body
  })
  if (EmpDet) {
    return res.json(EmpDet)
  } else {
    res.send({ result: "No Employee Found" })
  }
});

//update Payment

router.put('/updatePay/:companyName/:signupName/:signupRole/:videoType', async (req, res) => {
  try {
    const companyName = req.params.companyName;
    const signupName = req.params.signupName;
    const signupRole = req.params.signupRole;
    const videoType = req.params.videoType;
    const updatedPaymentInfo = req.body;
    let updatedCompany;
    if (signupRole === 'Editor') {
      const existingCompany = await newCompany.findOne({ companyName: companyName, signupName: signupName, videoType: videoType });
      if (existingCompany) {

        updatedCompany = await newCompany.findOneAndUpdate(
          { companyName: companyName, signupName: signupName, videoType: videoType },
          { $set: updatedPaymentInfo },
          { new: true }
        );
      } else {
        const newEntry = { companyName: companyName, signupName: signupName, ...updatedPaymentInfo };
        updatedCompany = await newCompany(newEntry).save();
      }
      res.status(200).json({ message: "Payment information updated successfully", company: updatedCompany });
    } else {
      const existingCompany = await newCompany.findOne({ companyName: companyName, signupName: signupName });
      if (existingCompany) {
        updatedCompany = await newCompany.findOneAndUpdate(
          { companyName: companyName, signupName: signupName },
          { $set: updatedPaymentInfo },
          { new: true }
        );
      } else {
        const newEntry = { companyName: companyName, signupName: signupName, ...updatedPaymentInfo };
        updatedCompany = await newCompany(newEntry).save();
      }
      res.status(200).json({ message: "Payment information updated successfully", company: updatedCompany });
    }
  } catch (error) {
    console.error("Error updating paymeny information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Search Invoice

router.get('/searchInvoice/:mobile', async (req, res) => {
  try {
    const mobile = req.params.mobile;
    const isNumeric = !isNaN(mobile);

    // Build a flexible search query
    let searchConditions = [
      { custName: { $regex: mobile, $options: 'i' } }
    ];

    if (isNumeric) {
      searchConditions.push({ custNumb: Number(mobile) });
    }

    const data = await EstInvoice.find({
      $or: searchConditions
    });

    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for Invoice");
  }
});

//Search Data

router.get('/searchCustomer/:mobile', async (req, res) => {
  try {
    const mobile = req.params.mobile;
    // Check if the mobile parameter is a valid number
    const isNumeric = !isNaN(mobile);
    let searchCriteria = {
      "$or": [
        { custName: { $regex: mobile, $options: 'i' } },
        { projectStatus: { $regex: mobile, $options: 'i' } },
        { custBussiness: { $regex: mobile, $options: 'i' } } // Always search by custName using regex
      ]
    };
    // If mobile is a valid number, add custNumb search
    if (isNumeric) {
      searchCriteria["$or"].push({ custNumb: Number(mobile) });
    }
    let data = await Customer.find(searchCriteria);
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for customer");
  }
});

router.get('/searchLeads/:mobile', async (req, res) => {
  try {
    const mobile = req.params.mobile;
    // Check if the mobile parameter is a valid number
    const isNumeric = !isNaN(mobile);
    let searchCriteria = {
      "$or": [
        { custName: { $regex: mobile, $options: 'i' } },
        { projectStatus: { $regex: mobile, $options: 'i' } } // Always search by custName using regex
      ]
    };
    // If mobile is a valid number, add custNumb search
    if (isNumeric) {
      searchCriteria["$or"].push({ custNumb: Number(mobile) });
    }
    let data = await salesLead.find(searchCriteria);
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for customer");
  }
});

router.get('/customerProject/:projectStatus', async (req, res) => {
  let data = await salesLead.find(
    {
      projectStatus: { $regex: req.params.projectStatus }
    }
  )
  res.send(data);
});

router.get('/customerProjectName/:projectName', async (req, res) => {
  let data = await Customer.find(
    { custBussiness: { $regex: req.params.projectName } }
  )
  res.send(data);
});

// New Customer

// Google Sheet automation

const auth = new google.auth.GoogleAuth({
  //keyFile: "linen-server-454711-n0-68215f82d26a.json",
  keyFile: "pro-variety-455511-k8-92a3708046d2.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});
const sheets = google.sheets({ version: "v4", auth });

//const sheet_id = "1dSocR_Folw5nYP-Y9FftBouBP2BadOx8gxcK-CeGckM";
const sheet_id = "11fUcMQ4KyHkmnQ4XBG_tSWRyNRCZm6I2Mh3BAReMG0s";

// Column Headers to be Added When a New Sheet is Created
const HEADERS = [
  "Code", "Name", "Number 1", "Number 2", "Bussiness", "Closing Date",
  "Closing Price", "Closing Category", "Bill Type", "Qr code", "Advance Payment",
  "Remaining Amount", "Rest Amount", "Rest Amount Date", "Customer Type", "Country", "State",
  "City", "Project Status", "Sales Person", "Remark"
];

const appendToGoogleSheet = async (customer) => {
  try {
    if (!customer.closingDate) {
      console.error("Closing Date is required");
      return;
    }
    const closingDate = new Date(customer.closingDate);
    const monthYear = `${closingDate.toLocaleString('default', { month: 'long' })} ${closingDate.getFullYear()}`;

    const sheetExists = await checkIfSheetExists(sheet_id, monthYear);
    if (!sheetExists) {
      await createNewSheet(sheet_id, monthYear);
      await addHeadersToSheet(sheet_id, monthYear);
    }

    const values = [
      [
        customer.custCode,
        customer.custName,
        customer.custNumb,
        customer.custNumb2,
        customer.custBussiness,
        //customer.closingDate ? customer.closingDate.toISOString() : "",
        customer.closingDate ? new Date(customer.closingDate).toLocaleDateString('en-GB') : "", // Format as DD-MM-YYYY
        customer.closingPrice,
        customer.closingCateg,
        customer.billType,
        customer.Qr,
        customer.AdvPay,
        customer.remainingAmount,
        customer.restAmount,
        //customer.restPaymentDate,
        customer.restPaymentDate ? new Date(customer.restPaymentDate).toLocaleDateString('en-GB') : "",
        customer.customerType,
        customer.custCountry,
        customer.custState,
        customer.custCity,
        customer.projectStatus,
        customer.salesPerson,
        customer.remark
      ],
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheet_id,
      range: `${monthYear}!A:Z`,
      valueInputOption: "USER_ENTERED",
      resource: { values },
    });
    console.log(`Data Added to Google Sheet -> sheet: ${monthYear}`)
  } catch (error) {
    console.error("Error adding data to Google Sheet:", error);
  }
};

const checkIfSheetExists = async (spreadsheetId, sheetTitle) => {
  try {
    const sheetData = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = sheetData.data.sheets.map(sheet => sheet.properties.title);
    return sheetNames.includes(sheetTitle);
  } catch (error) {
    console.error("Error checking sheet existence:", error);
    return false;
  }
};

const createNewSheet = async (spreadsheetId, sheetTitle) => {
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: { title: sheetTitle }
          }
        }]
      }
    });
    console.log(`New sheet "${sheetTitle}" created!`);
  } catch (error) {
    console.error("Error creating new sheet:", error);
  }
};

// ✅ Function to Add Headers to the New Sheet
const addHeadersToSheet = async (spreadsheetId, sheetTitle) => {
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:Z1`, // Set headers in the first row
      valueInputOption: "USER_ENTERED",
      resource: { values: [HEADERS] }
    });
    console.log(`Headers added to sheet: ${sheetTitle}`);
  } catch (error) {
    console.error("Error adding headers to sheet:", error);
  }
};

// router.post('/customer', async (req, res) => {
//   try {
//     const customer = new Customer(req.body);
//     await customer.save();

//     await appendToGoogleSheet(customer);
//     res.json({ success: true, message: "Customer Added and Google Sheet Updated" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Error adding Customer", error: error.message });
//   }
// });

// router.post('/customer', async (req, res) => {
//   try {
//     const {
//       graphicsCount = 0,
//       videosCount = 0,
//       reelsCount = 0,
//       custName,
//       closingDate,
//       custCode,
//     } = req.body;

//     // Convert custCode to number (if it's string)
//     const baseCustCode = parseInt(custCode, 10);
//     if (isNaN(baseCustCode)) {
//       return res.status(400).json({ success: false, message: "Invalid custCode: must be a number" });
//     }

//     // ✅ Create main entry (include counts)
//     const mainCustomer = new Customer({
//       ...req.body,
//       entryType: 'Main',
//       graphicsCount,
//       videosCount,
//       reelsCount
//     });
//     await mainCustomer.save();

//     // ✅ Generate sub-entries with incremented custCodes
//     let nextCustCode = baseCustCode + 1;
//     const subEntries = [];

//     const createSubEntries = (count, type) => {
//       for (let i = 1; i <= count; i++) {
//         subEntries.push(new Customer({
//           custName: `${custName} (${type} ${i})`,
//           closingDate,
//           custCode: nextCustCode++,
//           entryType: type
//         }));
//       }
//     };

//     createSubEntries(graphicsCount, 'Graphic');
//     createSubEntries(videosCount, 'Video');
//     createSubEntries(reelsCount, 'Reel');

//     if (subEntries.length > 0) {
//       await Customer.insertMany(subEntries);
//     }

//     // ✅ Send only main entry to Google Sheet
//     await appendToGoogleSheet(mainCustomer);

//     res.json({
//       success: true,
//       message: `Main entry and ${subEntries.length} sub-entry(ies) saved.`,
//     });

//   } catch (error) {
//     console.error("Error in /customer:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error adding customer",
//       error: error.message,
//     });
//   }
// });

router.post('/customer', async (req, res) => {
  try {
    const {
      custCode,
      custName,
      closingDate,
      graphicsCount = 0,
      videosCount = 0,
      reelsCount = 0,
      custBussiness,
      salesPerson,
      companyName,
      priority,
      ...restFields
    } = req.body;

    const baseCustCode = parseInt(custCode, 10);
    if (isNaN(baseCustCode)) {
      return res.status(400).json({ success: false, message: "Invalid custCode" });
    }

    let nextCustCode = 1;
    const subEntries = [];

    const createSubEntries = (count, type) => {
      for (let i = 1; i <= count; i++) {
        subEntries.push({
          custCode: `${custCode}.${nextCustCode++}`,
          custName: `${custName} (${type} ${i})`,
          entryType: type,
          custBussiness: custBussiness,
          salesPerson: salesPerson,
          companyName: companyName,
          priority: priority
        });
      }
    };

    createSubEntries(graphicsCount, "Graphic");
    createSubEntries(videosCount, "Video");
    createSubEntries(reelsCount, "Reel");

    const customerData = {
      custCode: baseCustCode,
      custName,
      closingDate,
      graphicsCount,
      videosCount,
      reelsCount,
      entryType: "Main",
      subEntries,
      salesPerson,
      companyName,
      custBussiness,
      priority,
      ...restFields
    };

    const customer = new Customer(customerData);
    await customer.save();

    await appendToGoogleSheet(customer);

    res.json({
      success: true,
      message: "Customer added with sub-entries.",
      data: customer
    });

  } catch (error) {
    console.error("Error adding customer:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});



// Country State City

router.get('/countries', async (req, res) => {
  try {
    const countries = Country.getAllCountries();
    res.json(countries);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/states/:countryCode', (req, res) => {
  const { countryCode } = req.params;
  const states = State.getStatesOfCountry(countryCode);
  res.json(states);
});

router.get('/cities/:countryCode/:stateCode', (req, res) => {
  const { countryCode } = req.params;
  const { stateCode } = req.params;
  const cities = City.getCitiesOfState(countryCode, stateCode);
  res.json(cities);
});

//month-wise data

router.get('/totalEntries', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0, 23, 59, 59, 999)
      }
    };
    const totalEntries = await Customer.find(query);
    const totalAmount = totalEntries.reduce((sum, doc) => sum + doc.closingPrice, 0);
    const totalRecv = totalEntries.reduce((sum, doc) => sum + doc.AdvPay + doc.restAmount, 0);
    const totalDue = totalEntries.reduce((sum, doc) => sum + doc.remainingAmount, 0);
    res.json({ totalEntries, totalAmount, totalRecv, totalDue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Today Received Amount

router.get('/todayAmount', async (req, res) => {
  const currentDate = new Date();
  try {
    let query1 = {
      closingDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    let query2 = {
      restPaymentDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const advToday = await Customer.find(query1);
    const advAmount = advToday.reduce((sum, doc) => sum + (doc.AdvPay || 0), 0);
    const restToday = await Customer.find(query2);
    const restAmount = restToday.reduce((sum, doc) => sum + (doc.restAmount || 0), 0);
    const totalAmount = advAmount + restAmount;
    res.json({ totalAmount, advToday, restToday, advAmount, restAmount });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Received QR

router.get('/receivedQr', async (req, res) => {
  const currentDate = new Date();

  // Helper function to generate query objects
  const generateQuery = (qrName, dateField) => ({
    [dateField]: {
      $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
      $lte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1),
    },
    Qr: qrName,
  });

  // Helper function to calculate total amounts
  const calculateTotalAmount = async (qrName) => {
    const advQuery = generateQuery(qrName, 'closingDate');
    const restQuery = generateQuery(qrName, 'restPaymentDate');

    const advDocs = await Customer.find(advQuery);
    const restDocs = await Customer.find(restQuery);

    const advAmount = advDocs.reduce((sum, doc) => sum + (doc.AdvPay || 0), 0);
    const restAmount = restDocs.reduce((sum, doc) => sum + (doc.restAmount || 0), 0);

    return { advDocs, restDocs, advAmount: advAmount, restAmount: restAmount, totalAmount: advAmount + restAmount };
  };

  try {
    // Calculate totals for each Qr name
    const [admixMedia, shivaVarshney, swatiVarshney, umeshchandVarshney, anupamVarshney] = await Promise.all([
      calculateTotalAmount('Admix Media'),
      calculateTotalAmount('Shiva Varshney'),
      calculateTotalAmount('Swati Varshney'),
      calculateTotalAmount('Umeshchand Varshney'),
      calculateTotalAmount('Anupam Varshney')
    ]);

    res.json({
      totals: {
        AdmixMedia: admixMedia.totalAmount,
        ShivaVarshney: shivaVarshney.totalAmount,
        SwatiVarshney: swatiVarshney.totalAmount,
        UmeshchandVarshney: umeshchandVarshney.totalAmount,
        AnupamVarshney: anupamVarshney.totalAmount
      },
      advTotals: {
        AdmixMedia: admixMedia.advAmount,
        ShivaVarshney: shivaVarshney.advAmount,
        SwatiVarshney: swatiVarshney.advAmount,
        UmeshchandVarshney: umeshchandVarshney.advAmount,
        AnupamVarshney: anupamVarshney.advAmount
      },
      restTotals: {
        AdmixMedia: admixMedia.restAmount,
        ShivaVarshney: shivaVarshney.restAmount,
        SwatiVarshney: swatiVarshney.restAmount,
        UmeshchandVarshney: umeshchandVarshney.restAmount,
        AnupamVarshney: anupamVarshney.restAmount
      },
      details: {
        admixMediaAdv: admixMedia.advDocs,
        admixMediaRest: admixMedia.restDocs,
        shivaVarshneyAdv: shivaVarshney.advDocs,
        shivaVarshneyRest: shivaVarshney.restDocs,
        swatiVarshneyAdv: swatiVarshney.advDocs,
        swatiVarshneyRest: swatiVarshney.restDocs,
        umeshchandVarshneyAdv: umeshchandVarshney.advDocs,
        umeshchandVarshneyRest: umeshchandVarshney.restDocs,
        anupamVarshneyAdv: anupamVarshney.advDocs,
        anupamVarshneyRest: anupamVarshney.restDocs
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// total Month rest Amount Received

router.get('/totalRecvAmount', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      restPaymentDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0, 23, 59, 59, 999)
      }
    };
    const totalEntries = await Customer.find(query);
    const totalMonthRecv = totalEntries.reduce((sum, doc) => sum + doc.restAmount, 0);
    res.json(totalMonthRecv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalEntriesEmp', checkAuth, async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const person1 = req.userData?.name;
    let query;
    query = {
      salesPerson: person1,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0, 23, 59, 59, 999)
      }
    };
    const totalEntries = await Customer.find(query);
    const totalAmount = totalEntries.reduce((sum, doc) => sum + doc.closingPrice, 0);
    const totalRecv = totalEntries.reduce((sum, doc) => sum + doc.AdvPay + doc.restAmount, 0);
    const totalDue = totalEntries.reduce((sum, doc) => sum + doc.remainingAmount, 0);
    res.json({ totalEntries, totalAmount, totalRecv, totalDue });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalEntriesDue', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      salesPerson: person,
      remainingAmount: { $gt: 0 },
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0, 23, 59, 59, 999)
      }
    };
    const dueAmount = await Customer.find(query);
    res.json(dueAmount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalEntriesDueDownload', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      salesPerson: person,
      remainingAmount: { $gt: 0 },
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getUTCFullYear(), currentMonth, 0, 23, 59, 59, 999)
      }
    };
    const dueAmount = await Customer.find(query);
    const data = dueAmount.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'dueAmountCustomers.xlsx');
    res.download('dueAmountCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

router.get('/totalEntriesRest', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      salesPerson: person,
      restAmount: { $gt: 0 },
      restPaymentDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getUTCFullYear(), currentMonth, 0, 23, 59, 59, 999)
      }
    };
    const restAmount = await Customer.find(query);
    res.json(restAmount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalEntriesRestDownload', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      salesPerson: person,
      restAmount: { $gt: 0 },
      restPaymentDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getUTCFullYear(), currentMonth, 0)
      }
    };
    const restAmount = await Customer.find(query);
    const data = restAmount.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'restAmountCustomers.xlsx');
    res.download('restAmountCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

router.get('/totalEntriesDueAdmin', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      remainingAmount: { $gt: 0 },
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    };
    const dueAmount = await Customer.find(query);
    res.json(dueAmount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalEntriesRestAdmin', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      restAmount: { $gt: 0 },
      restPaymentDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getUTCFullYear(), currentMonth, 0, 23, 59, 59, 999)
      }
    };
    const restAmount = await Customer.find(query);
    res.json(restAmount);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalEntriesRestDownloadAdmin', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      restAmount: { $gt: 0 },
      restPaymentDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getUTCFullYear(), currentMonth, 0)
      }
    };
    const restAmount = await Customer.find(query);
    const data = restAmount.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'restAmountCustomers.xlsx');
    res.download('restAmountCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

router.get('/totalEntriesDueDownloadAdmin', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      remainingAmount: { $gt: 0 },
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getUTCFullYear(), currentMonth, 0)
      }
    };
    const dueAmount = await Customer.find(query);
    const data = dueAmount.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'dueAmountCustomers.xlsx');
    res.download('dueAmountCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

// Current Day Entry

router.get('/todayEntries', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      closingDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/todayEntriesDownloadAdmin', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      closingDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    const data = totalDayEntry.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'todayEntryCustomers.xlsx');
    res.download('todayEntryCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

router.get('/totalEntriesDownloadAdmin', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    };
    const totalEntry = await Customer.find(query);
    const data = totalEntry.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'totalEntryCustomers.xlsx');
    res.download('totalEntryCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

router.get('/allOngoingProjectsDownloadAdmin', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      projectStatus: { $ne: 'Completed' }
    };
    const allOngoingEntry = await Customer.find(query);
    const data = allOngoingEntry.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'ActiveCustomers.xlsx');
    res.download('ActiveCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

router.get('/allActiveProjectsDownloadAdmin', async (req, res) => {
  try {
    let query;
    query = {
      projectStatus: { $ne: 'Completed' }
    };
    const allActiveEntry = await Customer.find(query);
    const data = allActiveEntry.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'AllActiveCustomers.xlsx');
    res.download('AllActiveCustomers.xlsx');
  } catch (error) {
    console.error('Error Downloading File', error);
    res.status(500).json({ message: 'Failed to download File' });
  }
});

router.get('/todayEntriesEmp', checkAuth, async (req, res) => {
  const currentDate = new Date();
  try {
    const person1 = req.userData?.name;
    let query;
    query = {
      salesPerson: person1,
      closingDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//Data By Date Range

router.get('/dataByRange/:startDate/:endDate', checkAuth, async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    const person1 = req.userData?.name;
    const role1 = Array.isArray(req.userData.signupRole) ? req.userData.signupRole[0] : req.userData.signupRole;
    let query;
    if (role1 === 'Admin' || role1 === 'Manager' || role1 === 'Team Leader') {
      query = {
        closingDate: {
          $gte: startDate, $lte: endDate
        }
      };
    } else {
      query = {
        salesPerson: person1,
        closingDate: {
          $gte: startDate, $lte: endDate
        }
      };
    }
    const rangeTotalData = await Customer.find(query);
    const rangeTotalAmount = rangeTotalData.reduce((sum, doc) => sum + doc.closingPrice, 0);
    const rangeTotalRecv = rangeTotalData.reduce((sum, doc) => sum + doc.AdvPay + doc.restAmount, 0);
    const rangeTotalDue = rangeTotalData.reduce((sum, doc) => sum + doc.remainingAmount, 0);
    console.log("Range TOtal Amount===>>", rangeTotalAmount);
    res.json({
      rangeTotalData: rangeTotalData,
      rangeTotalAmount: rangeTotalAmount,
      rangeTotalRecv: rangeTotalRecv,
      rangeTotalDue: rangeTotalDue
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/onGoingRange/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query;
    if (role === 'Admin' || role === 'Manager') {
      query = {
        closingDate: {
          $gte: startDate, $lte: endDate
        },
        projectStatus: { $ne: 'Completed' }
      };
    } else {
      query = {
        salesPerson: person,
        closingDate: {
          $gte: startDate, $lte: endDate
        },
        projectStatus: { $ne: 'Completed' }
      };
    }
    const totalData = await Customer.find(query);
    res.json(totalData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/rangeTopPerformer/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    const query = await Customer.aggregate([
      {
        $match: {
          closingDate: {
            $gte: startDate, $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: '$salesPerson',
          totalClosingPrice: { $sum: '$closingPrice' }
        }
      },
      {
        $sort: { totalClosingPrice: -1 }
      }
    ]);
    if (query.length > 0) {
      query.forEach(result => {
        console.log(`SalesPerson: ${query._id}, Total CLosing Price: ${result.totalClosingPrice}`);
      });
      res.json(query);
    } else {
      console.log('No sales Entries Found')
    }
  } catch (error) {
    console.log("Error getting Top Performer", error.message);
    res.status(500).json({ json: "Fail", error: error.message });
  }
});

router.get('/rangeTotalRecvAmount/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      restPaymentDate: { $gte: startDate, $lte: endDate }
    };
    const totalEntries = await Customer.find(query);
    const totalMonthRecv = totalEntries.reduce((sum, doc) => sum + doc.restAmount, 0);
    res.json(totalMonthRecv);
  } catch (error) {
    console.log("Error getting Total Received Amount", error.message);
    res.status(500).json({ json: "Failed", error: error.message });
  }
});

//Excel Upload

router.post('/uploadFile', upload.single('file'), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    await Customer.insertMany(data);
    res.status(200).json({ message: 'Data Upload Successfull' });
  } catch (err) {
    console.error("Error Uploading File", err);
    res.status(500).json({ error: "Failed to Upload File" });
  }
});

//donwload Excel

router.get('/downloadFile', checkAuth, async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const person1 = req.userData?.name;
    const role1 = Array.isArray(req.userData.signupRole) ? req.userData.signupRole[0] : req.userData.signupRole;
    let query;
    if (role1 === 'Admin' || role1 === 'Manager' || role1 === 'Team Leader') {
      query = {
        closingDate: {
          $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
          $lte: new Date(new Date().getFullYear(), currentMonth, 0)
        }
      };
    } else {
      query = {
        salesPerson: person1,
        closingDate: {
          $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
          $lte: new Date(new Date().getFullYear(), currentMonth, 0)
        }
      };
    }
    const customers = await Customer.find(query);
    const data = customers.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'Qr': customer.Qr,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch (err) {
    console.error('Error Downloading File', err);
    res.status(500).json({ error: 'Failed to download File' });
  }
});

router.get('/downloadRangeFile/:startDate/:endDate', checkAuth, async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    const person1 = req.userData?.name;
    const role1 = Array.isArray(req.userData.signupRole) ? req.userData.signupRole[0] : req.userData.signupRole;
    let query;
    if (role1 === 'Admin' || role1 === 'Manager' || role1 === 'Team Leader') {
      query = {
        closingDate: {
          $gte: startDate, $lte: endDate
        }
      };
    } else {
      query = {
        salesPerson: person1,
        closingDate: {
          $gte: startDate, $lte: endDate
        }
      };
    }
    const rangeFileData = await Customer.find(query);
    const data = rangeFileData.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'Qr': customer.Qr,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch (err) {
    console.error('Error Downloading File', err);
    res.status(500).json({ error: 'Failed to download File' });
  }
});

// Download Sales Range Data

router.get('/downloadSalesRangeFile/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeFileData = await salesLead.find(query);
    const data = rangeFileData.map(customer => ({
      'campaign_Name': customer.campaign_Name,
      'ad_Name': customer.ad_Name,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custEmail': customer.custEmail,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'state': customer.state,
      'projectStatus': customer.projectStatus,
      'salesTeam': customer.salesTeam,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch (err) {
    console.error('Error Downloading File', err);
    res.status(500).json({ error: 'Failed to download File' });
  }
});

// Download Due Data

router.get('/downloadDueFile/:startDate/:endDate', checkAuth, async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    const person1 = req.userData?.name;
    const role1 = Array.isArray(req.userData.signupRole) ? req.userData.signupRole[0] : req.userData.signupRole;
    let query;
    if (role1 === 'Admin' || role1 === 'Manager' || role1 === 'Team Leader') {
      query = {
        closingDate: {
          $gte: startDate, $lte: endDate
        },
        remainingAmount: { $gt: 0 }
      };
    } else {
      query = {
        salesPerson: person1,
        closingDate: {
          $gte: startDate, $lte: endDate
        },
        remainingAmount: { $gt: 0 }
      };
    }
    const rangeFileData = await Customer.find(query);
    const data = rangeFileData.map(customer => ({
      'custCode': customer.custCode,
      'custName': customer.custName,
      'custNumb': customer.custNumb,
      'custBussiness': customer.custBussiness,
      'closingDate': customer.closingDate,
      'closingPrice': customer.closingPrice,
      'closingCateg': customer.closingCateg,
      'billType': customer.billType,
      'AdvPay': customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'restAmount': customer.restAmount,
      'restPaymentDate': customer.restPaymentDate,
      'Qr': customer.Qr,
      'custCountry': customer.custCountry,
      'custCity': customer.custCity,
      'custState': customer.custState,
      'projectStatus': customer.projectStatus,
      'salesPerson': customer.salesPerson,
      'youtubeLink': customer.youtubeLink,
      'remark': customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch (err) {
    console.error('Error Downloading File', err);
    res.status(500).json({ error: 'Failed to download File' });
  }
});

// Add New Category

router.post('/newCategory', async (req, res) => {
  try {
    const category = new ClosingCategory({
      categoryName: req.body.categoryName
    })
    await category.save().then((_) => {
      res.json({ success: true, message: "New Category Added" })
    }).catch((err) => {
      if (err.code === 11000) {
        return res.json({ success: false, message: "Category Already Added" })
      }
    });
  } catch (error) {
    console.error('Error Adding Category', error);
    res.status(500).json({ error: 'Failed to add Category' });
  }
});

// new WhatsApp Category

router.post('/newWhatsAppCategory', async (req, res) => {
  try {
    const category = new WhatsAppCategory({
      whatsAppCategoryName: req.body.whatsAppCategoryName
    })
    await category.save().then((_) => {
      res.json({ success: true, message: "New Category Added" })
    }).catch((err) => {
      if (err.code === 11000) {
        return res.json({ success: false, message: "Category Already Added" })
      }
    });
  } catch (error) {
    console.error('Error Adding Category', error);
    res.status(500).json({ error: 'Failed to add Category' });
  }
});

// get Category

router.get('/getCategory', async (req, res) => {
  try {
    const categories = await ClosingCategory.find();
    res.json(categories);
  } catch (error) {
    console.error("Error Fetching Categories", error);
    res.status(500).json({ error: 'Failed to Fetch Category Data ' })
  }
});

// get WhatsApp Category

router.get('/getWhatsAppCategory', async (req, res) => {
  try {
    const categories = await WhatsAppCategory.find();
    res.json(categories);
  } catch (error) {
    console.error("Error Fetching Categories", error);
    res.status(500).json({ error: 'Failed to Fetch Category Data ' })
  }
});

// New Sales Team

router.post('/newSalesTeam', async (req, res) => {
  try {
    const salesTeam = new newSalesTeam({
      salesTeamName: req.body.salesTeamName
    })
    await salesTeam.save().then((_) => {
      res.json({ success: true, message: "New Sales Team Added" })
    }).catch((err) => {
      if (err.code === 11000) {
        return res.json({ success: false, message: "Sales Team Already Exist" })
      }
    });
  } catch (error) {
    console.error('Error Adding Sales Team', error);
    res.status(500).json({ error: 'Failed to add Sales Team' });
  }
});

//get Sales Team

router.get('/getSalesTeam', async (req, res) => {
  try {
    const salesTeams = await newSalesTeam.find();
    res.json(salesTeams);
  } catch (error) {
    console.error("Error Fetching Sales Team", error);
    res.status(500).json({ error: 'Failed to Fetch Sales Team Data ' })
  }
});

// get Company

router.get('/getCompany', async (req, res) => {
  try {
    const companies = await newCompany.find();
    res.json(companies);
  } catch (error) {
    console.error("Error Fetching Company Names", error);
    res.status(500).json({ error: 'Failed to fetch Company Name' })
  }
});

//new Company

router.post('/addCompany', async (req, res) => {
  try {
    const newCompanyName = new newCompany({
      companyName: req.body.companyName
    })
    await newCompanyName.save().then((_) => {
      res.json({ success: true, message: "New Comapny Added" })
    })
  } catch (error) {
    console.error('Error Adding Company Name', error);
    res.status(500).json({ error: 'Failed to Add Company Name' })
  }
});

// delete Company

router.delete('/delete-comp/:id', async (req, res) => {
  try {
    const deleteData = await newCompany.findByIdAndDelete(req.params.id);
    if (deleteData) {
      //console.log("Delete ==>", deleteData);
      return res.json(deleteData);
    } else {
      return res.json({ result: "No Data Deleted" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

//store Access Token

router.post('/fbToken', async (req, res) => {
  try {
    const existingToken = await FbAccessToken.findOne();
    if (existingToken) {
      existingToken.newAccessToken = req.body.newAccessToken;
      await existingToken.save().then((_) => {
        res.json({ success: true, message: "Access Token Updated" })
      });
    } else {
      const accessToken = new FbAccessToken({
        newAccessToken: req.body.newAccessToken
      })
      await accessToken.save().then((_) => {
        res.json({ success: true, message: "New Access Token Stored" })
      })
    }
  } catch (error) {
    console.error('Error Storing Access Token', error);
    res.status(500).json({ error: 'Failed to store Access Token' });
  }
});

//get Fb Token

router.get('/getFbToken', async (req, res) => {
  try {
    const token = await FbAccessToken.find();
    res.json(token);
  } catch (error) {
    console.error("Error Fetching Access Token", error);
    res.status(500).json({ error: 'Failed to fetch Access Token' })
  }
});

// Facebook integration Api

//local accessToken
//const accessToken = 'EAAWYGC5I1ZCMBOZCHJ1ZAullgKhNPY2ZBOYvxKZAXKNclVH4u5tAsb1dEhE4NCq1EEzszPLNg3KqHC4a565AANqH7ltCHXiVC6E8JdN1Pcts0nD97oPD85HNwblUAMZBUFZC2lC6kJVR25ZAeDg7baj25ike0lcs9HYELWfiYGC8f5ZCypc2h2M2m9PX5';

//Real accessToken
//const accessToken = 'EAANSY8Y9OkYBOZC9QM1UlFWzPaBAEl2n9n3RFnOIKSpurvajA0Conk66E2S98SwkfSxE4llIxRJM6IYKFE4QTGmeK5Ul3JmyNbeefkWBy95hQfVZBUzgXTbjBXhAD5UlZBfTwRsPBq9f5C2UT3eYcZAyGzmiN9BhVifNJ8oQXYgmCjnNE2ewxqlU'

router.get('/facebook-leads', async (req, res) => {
  await Lead.deleteMany();
  try {
    const accessToken1 = await FbAccessToken.findOne();
    //Local
    //const response = await axios.get(`https://graph.facebook.com/v19.0/me?fields=adaccounts%7Bid%2Ccampaigns%7Bid%2Cname%2Cads%7Bname%2Cleads%7D%7D%7D&access_token=${accessToken}`);
    //Real
    const response = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id%2Cadaccounts%7Bcampaigns%7Bid%2Cname%2Cads%7Bname%2Cleads%7D%7D%7D&access_token=${accessToken1.newAccessToken}`);


    const leadsData = response.data.adaccounts.data;
    let cust_name, company_name, phone, state, email = '';

    for (const leadData of leadsData) {
      const campaigns = leadData.campaigns.data;

      for (const campaign of campaigns) {
        const { id: campId, name: campName, ads } = campaign;

        for (const ad of ads.data) {
          const { name: adName, leads } = ad;

          if (leads && leads.data) {
            for (const lead of leads.data) {
              const { created_time: createdTime, field_data } = lead;

              for (const field of field_data) {
                if (field.name === 'full_name') {
                  cust_name = field.values[0];
                } else if (field.name === 'email') {
                  email = field.values[0];
                } else if (field.name === 'company_name') {
                  company_name = field.values[0];
                } else if (field.name === 'phone_number') {
                  phone = field.values[0];
                } else if (field.name === 'state') {
                  state = field.values[0];
                }
              }
              const newLead = new Lead({
                id: leadData.id,
                campaign_Name: campName,
                ad_Name: adName,
                created_time: createdTime,
                name: cust_name,
                phone: phone,
                email: email,
                company_name: company_name,
                state: state,
                salesTeam: ""
              });
              await newLead.save();
            }
          }
        }
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error fetching and saving Facebook leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// sales automatic facebook leads

//itwebdeveloper
// const CLIENT_ID = '611503530952-n54spv580ddm2qmkedlohmvcgclns7cc.apps.googleusercontent.com';
// const CLIENT_SECRET = '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';
// const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
// const REFERESH_TOKEN = '1//04SBK6MQijeCRCgYIARAAGAQSNwF-L9IrABSabeovlomKAcbDlyLAbEBHVGVUGIJ6dS6fT9y2rJIbvOxJ8nM7QJeAYaOPG7K8ros';

// AdmixmediaIndia
const CLIENT_ID = '163851234056-46n5etsovm4emjmthe5kb6ttmvomt4mt.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFERESH_TOKEN = '1//04DK5QNf7VwvSCgYIARAAGAQSNwF-L9Irval3hCo3J9j3btA-wYYtp05bBPZ0yG7RyneFcR89NyFNkuRlenluyvOHroaShpVXImA';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFERESH_TOKEN })
const people = google.people({
  version: 'v1',
  auth: oauth2Client
});

//API TO ASSIGN EMPLOYEES TO A CAMPAIGN

router.put("/assign-campaign", async (req, res) => {
  try {
    const { campaignName, employees } = req.body;

    if (!campaignName || !Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: "Invalid campaign or employees list" });
    }

    await CampaignAssignment.findOneAndUpdate(
      { campaignName },
      { employees },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Campaign assigned successfully!" });
  } catch (error) {
    console.error("❌ Error assigning campaign:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/get-assigned-campaigns", async (req, res) => {
  try {
    // Fetch all campaign names from leads
    const oneMonthAgo = moment().subtract(30, 'days').toDate();
    const recentLeads = await salesLead.find({ leadsCreatedDate: { $gte: oneMonthAgo } });
    const campaignNames = [...new Set(recentLeads.map(lead => lead.campaign_Name))];

    // Fetch all assigned campaigns
    const assignedCampaigns = await CampaignAssignment.find();

    // Merge assigned employees into campaign names
    const campaignsWithAssignments = campaignNames.map((campaignName) => {
      const assignment = assignedCampaigns.find(a => a.campaignName === campaignName);
      return {
        campaignName: campaignName,
        employees: assignment ? assignment.employees : [] // Default to empty if not assigned
      };
    });

    res.json({ success: true, data: campaignsWithAssignments });
  } catch (error) {
    console.error("❌ Error fetching campaigns:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 Function to Delay (Exponential Backoff for Rate Limits)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔹 Function to Fetch Facebook Leads
const fetchLeadsFromFacebook = async (accessToken) => {
  let allLeads = [];
  let nextPage = `https://graph.facebook.com/v22.0/me?fields=id,adaccounts{campaigns{id,name,ads{name,leads.limit(100){created_time,field_data}}}}&access_token=${accessToken}`;

  let retryCount = 0;
  const maxRetries = 5; // Prevent infinite loops

  while (nextPage && retryCount < maxRetries) {
    try {
      //console.log(`Fetching leads from: ${nextPage}`);
      const fbResponse = await axios.get(nextPage);

      if (!fbResponse.data || !fbResponse.data.adaccounts || !Array.isArray(fbResponse.data.adaccounts.data)) {
        throw new Error('Invalid response structure from Facebook API');
      }

      const leadsData = fbResponse.data.adaccounts.data;

      for (const leadData of leadsData) {
        for (const campaign of leadData.campaigns?.data || []) {
          for (const ad of campaign.ads?.data || []) {
            for (const lead of ad.leads?.data || []) {
              allLeads.push({
                created_time: lead.created_time,
                field_data: lead.field_data,
                campaign_Name: campaign.name,
                ad_Name: ad.name
              });
            }
          }
        }
      }

      // Handle Pagination
      nextPage = fbResponse.data.paging?.next || null;
      retryCount = 0; // Reset retry count on success
    } catch (error) {
      console.error("❌ Facebook API Error:", error.message);
      retryCount++;
      await delay(2 ** retryCount * 1000); // Exponential backoff
    }
  }

  return allLeads;
};

// 🔹 Function to Fetch & Save Leads
const fetchAndSaveFacebookLeads = async () => {
  try {
    // Fetch Access Token
    const accessTokenRecord = await FbAccessToken.findOne();
    if (!accessTokenRecord || !accessTokenRecord.newAccessToken) {
      console.error('❌ Access token is missing or invalid');
      return;
    }
    const accessToken = accessTokenRecord.newAccessToken;

    // Fetch Leads
    const leads = await fetchLeadsFromFacebook(accessToken);

    for (const lead of leads) {
      const { created_time: createdTime, field_data, campaign_Name, ad_Name } = lead;
      const formattedDate = new Date(createdTime).toISOString().slice(0, 10).split('-').reverse().join('');

      let leadObj = {
        custName: '',
        custEmail: '',
        custBussiness: '',
        custNumb: '',
        state: '',
        additionalFields: {}
      };

      if (Array.isArray(field_data)) {
        for (const field of field_data) {
          const fieldName = field.name.toLowerCase().replace('_', ' ');
          const value = Array.isArray(field.values) && field.values.length > 0 ? field.values[0] : '';

          if (fieldName === 'full name') leadObj.custName = value;
          else if (fieldName === 'email') leadObj.custEmail = value;
          else if (fieldName === 'company name') leadObj.custBussiness = value;
          else if (fieldName === 'phone number') leadObj.custNumb = value;
          else if (fieldName === 'state') leadObj.state = value;
          else leadObj.additionalFields[fieldName] = value;
        }
      }

      let existingLead = await salesLead.findOne({
        closingDate: createdTime
      });

      if (!existingLead) {
        const newLead = new salesLead({
          id: lead.id,
          closingDate: createdTime,
          campaign_Name: campaign_Name,
          ad_Name: ad_Name,
          custName: leadObj.custName,
          custEmail: leadObj.custEmail,
          custBussiness: leadObj.custBussiness,
          custNumb: leadObj.custNumb,
          state: leadObj.state,
          salesTeam: 'Sales Team 1',
          leadsCreatedDate: new Date(createdTime),
          subsidiaryName: 'AdmixMedia',
          additionalFields: leadObj.additionalFields
        });

        await newLead.save();
        console.log(`✅ New lead saved: ${leadObj.custName}`);

        // 🔹 Send Notification
        const notifTitle = "🎉 New Lead Alert!";
        const notifBody = `New lead from ${campaign_Name} (${leadObj.custName});`;

        //await sendNotif(userToken, notifTitle, notifBody);
        await sendCampaignNotif(campaign_Name, notifTitle, notifBody);
        console.log(`✅ Notification sent for: ${leadObj.custName}`);

        await people.people.createContact({
          requestBody: {
            names: [{ givenName: `${formattedDate} ${leadObj.custName}` }],
            emailAddresses: [{ value: leadObj.custEmail }],
            phoneNumbers: [{ value: leadObj.custNumb }],
            organizations: [{ name: leadObj.custBussiness }],
            addresses: [{ region: leadObj.state }]
          }
        });

        console.log(`✅ Lead saved to Google Contacts: ${leadObj.custName}`);
      } else {
        //console.log(`⚠️ Lead already exists: ${leadObj.custName}`);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching and saving Facebook leads 1:', error.message);
  }
};

// Second account facebook meta leads

//const delay1 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 🔹 Function to Fetch Facebook Leads for the Second Automation
const fetchAndSaveSecondFacebookLeads = async () => {
  try {
    const accessTokenRecord = await FbAccessToken.findOne();
    if (!accessTokenRecord || !accessTokenRecord.newAccessToken) {
      console.error('❌ Access token is missing or invalid');
      return;
    }

    // ✅ Hardcoded second access token
    const accessToken2 = 'EAAHV6LHxdvoBO2dIFGuzO2ZAkxf7JwfkoCd4wUPL23zcr8gxPBCtjgnuXCucWCdYitfVrEN8nPHG93kuoT0H7xlzcEWyk6FeuKts5eUl9GU1dZBPm7HxqRXjj5bL9ULvKXDRpSYNS3v0VRE1uPPxSBlV3dyPpIOzEcLBWoEIW0ooZCcIrF3YO75NA8GAODvaliLaKLc';
    //console.log('Using Access Token:', accessToken2);

    const response = await axios.get(`https://graph.facebook.com/v22.0/me?fields=id,adaccounts{campaigns{id,name,ads{name,leads}}}&access_token=${accessToken2}`);
    const leadsData = response.data.adaccounts?.data || [];

    let allLeads = [];

    for (const leadData of leadsData) {
      if (!leadData.campaigns || !leadData.campaigns.data) continue;

      for (const campaign of leadData.campaigns.data) {
        if (!campaign.ads || !campaign.ads.data) continue;

        for (const ad of campaign.ads.data) {
          if (!ad.leads || !ad.leads.data) continue;

          for (const lead of ad.leads.data) {
            const { created_time: createdTime, field_data } = lead;
            const formattedDate = new Date(createdTime).toISOString().slice(0, 10).split('-').reverse().join('');

            let leadObj = {
              custName: '',
              custEmail: '',
              custBussiness: '',
              custNumb: '',
              state: '',
              additionalFields: {}
            };

            for (const field of field_data) {
              const fieldName = field.name.toLowerCase().replace('_', ' ');
              const value = Array.isArray(field.values) && field.values.length > 0 ? field.values[0] : '';

              if (fieldName === 'full name') leadObj.custName = value;
              else if (fieldName === 'email') leadObj.custEmail = value;
              else if (fieldName === 'company name') leadObj.custBussiness = value;
              else if (fieldName === 'phone number') leadObj.custNumb = value;
              else if (fieldName === 'state') leadObj.state = value;
              else leadObj.additionalFields[fieldName] = value;
            }

            let existingLead = await salesLead.findOne({ leadsCreatedDate: createdTime });

            if (!existingLead) {
              const newLead = new salesLead({
                id: leadData.id,
                closingDate: createdTime,
                campaign_Name: campaign.name,
                ad_Name: ad.name,
                custName: leadObj.custName,
                custEmail: leadObj.custEmail,
                custBussiness: leadObj.custBussiness,
                custNumb: leadObj.custNumb,
                state: leadObj.state,
                salesTeam: 'Sales Team 1',
                leadsCreatedDate: new Date(createdTime),
                additionalFields: leadObj.additionalFields
              });

              await newLead.save();
              console.log(`✅ New lead saved Second: ${leadObj.custName}`);

              const notifTitle = "🎉 New Lead Alert!";
              const notifBody = `New lead from ${campaign.name} (${leadObj.custName});`;

              await sendCampaignNotif(campaign.name, notifTitle, notifBody);
              console.log(`✅ Notification sent for: ${leadObj.custName}`);

              // ✅ Save to Google Contacts with formatted name
              await people.people.createContact({
                requestBody: {
                  names: [{ givenName: `${formattedDate} ${leadObj.custName}` }],
                  emailAddresses: [{ value: leadObj.custEmail }],
                  phoneNumbers: [{ value: leadObj.custNumb }],
                  organizations: [{ name: leadObj.custBussiness }],
                  addresses: [{ region: leadObj.state }]
                }
              });

              console.log(`✅ Lead saved to Google Contacts Second: ${formattedDate} ${leadObj.custName}`);
            }

            allLeads.push(leadObj);
          }
        }
      }
    }

    console.log(`✅ Successfully processed ${allLeads.length} leads`);
  } catch (error) {
    console.error('❌ Error fetching Facebook leads 2:', error.message);
  }
};

// 🔹 Function to Fetch Facebook Leads for the Second Automation
const fetchAndSaveThirdFacebookLeads = async () => {
  try {
    const accessTokenRecord = await FbAccessToken.findOne();
    if (!accessTokenRecord || !accessTokenRecord.newAccessToken) {
      console.error('❌ Access token is missing or invalid');
      return;
    }

    // ✅ Hardcoded second access token
    const accessToken3 = 'EAANAfeT7U5gBO6L8IJFEzDnR9ZC1bHr2Tqpf0xk0yZA69kFxgzpVJtowyTskxxC8qyZCiWR7OaQHsFZCiECGZB3LZBYVEUuP1BLWglGguZBZBDGFMQZAEnuxYXI4iKGCutpPpIRvfMXWWXdXEMSvP9LF5SrZBj8Ohy6ZAARuqM94GSpkbRyUqbmK9mPdKgSlpsd0zIQ2pz30SfW';
    //console.log('Using Access Token:', accessToken2);

    const response = await axios.get(`https://graph.facebook.com/v22.0/me?fields=id,adaccounts{campaigns{id,name,ads{name,leads}}}&access_token=${accessToken3}`);
    const leadsData = response.data.adaccounts?.data || [];

    let allLeads = [];

    for (const leadData of leadsData) {
      if (!leadData.campaigns || !leadData.campaigns.data) continue;

      for (const campaign of leadData.campaigns.data) {
        if (!campaign.ads || !campaign.ads.data) continue;

        for (const ad of campaign.ads.data) {
          if (!ad.leads || !ad.leads.data) continue;

          for (const lead of ad.leads.data) {
            const { created_time: createdTime, field_data } = lead;
            const formattedDate = new Date(createdTime).toISOString().slice(0, 10).split('-').reverse().join('');

            let leadObj = {
              custName: '',
              custEmail: '',
              custBussiness: '',
              custNumb: '',
              state: '',
              additionalFields: {}
            };

            for (const field of field_data) {
              const fieldName = field.name.toLowerCase().replace('_', ' ');
              const value = Array.isArray(field.values) && field.values.length > 0 ? field.values[0] : '';

              if (fieldName === 'full name') leadObj.custName = value;
              else if (fieldName === 'email') leadObj.custEmail = value;
              else if (fieldName === 'company name') leadObj.custBussiness = value;
              else if (fieldName === 'phone number') leadObj.custNumb = value;
              else if (fieldName === 'state') leadObj.state = value;
              else leadObj.additionalFields[fieldName] = value;
            }

            let existingLead = await salesLead.findOne({ leadsCreatedDate: createdTime });

            if (!existingLead) {
              const newLead = new salesLead({
                id: leadData.id,
                closingDate: createdTime,
                campaign_Name: campaign.name,
                ad_Name: ad.name,
                custName: leadObj.custName,
                custEmail: leadObj.custEmail,
                custBussiness: leadObj.custBussiness,
                custNumb: leadObj.custNumb,
                state: leadObj.state,
                salesTeam: 'Sales Team 1',
                leadsCreatedDate: new Date(createdTime),
                additionalFields: leadObj.additionalFields
              });

              await newLead.save();
              console.log(`✅ New lead saved Third: ${leadObj.custName}`);

              const notifTitle = "🎉 New Lead Alert!";
              const notifBody = `New lead from ${campaign.name} (${leadObj.custName});`;

              await sendCampaignNotif(campaign.name, notifTitle, notifBody);
              console.log(`✅ Notification sent for: ${leadObj.custName}`);

              // ✅ Save to Google Contacts with formatted name
              await people.people.createContact({
                requestBody: {
                  names: [{ givenName: `${formattedDate} ${leadObj.custName}` }],
                  emailAddresses: [{ value: leadObj.custEmail }],
                  phoneNumbers: [{ value: leadObj.custNumb }],
                  organizations: [{ name: leadObj.custBussiness }],
                  addresses: [{ region: leadObj.state }]
                }
              });

              console.log(`✅ Lead saved to Google Contacts Third: ${formattedDate} ${leadObj.custName}`);
            }
            allLeads.push(leadObj);
          }
        }
      }
    }

    console.log(`✅ Successfully processed ${allLeads.length} leads`);
  } catch (error) {
    console.error('❌ Error fetching Facebook leads 3:', error.message);
  }
};

// Helper function to format date for lead names
// function formatDate(timestamp) {
//   const date = new Date(timestamp);
//   const day = String(date.getDate()).padStart(2, '0');
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const year = String(date.getFullYear()).slice(-2);
//   return `${day}${month}${year}`;
// }

// get leads

router.get('/getFacebook-leads', async (req, res) => {
  try {
    const fetchedLeads = await Lead.find().sort({ created_time: -1 });
    res.json(fetchedLeads);
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

//getSales-Leads

router.get('/getSalesFacebook-leads', async (req, res) => {
  try {
    const fetchedLeads = await salesLead.find().sort({ closingDate: -1 });
    res.json(fetchedLeads);
  } catch (error) {
    console.log("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

// Leads Transfer

router.post('/update-salespersons', async (req, res) => {
  try {
    const items = req.body.items;
    const updatedItems = [];
    for (const item of items) {
      let existingItem = await transferLead.findById(item._id);
      if (existingItem) {
        // Update the salesperson field
        existingItem.salesTeam = item.salesTeam;
        await existingItem.save();
        // Check if the item exists in the salesLead collection
        const salesLeadItem = await salesLead.findOne({ _id: existingItem._id });
        const customerLeadItem = await Customer.findOne({ _id: existingItem._id });
        if (!salesLeadItem && !customerLeadItem) {
          // Prepare the updated item for insertion into the salesLead collection
          const updatedItem = {
            _id: existingItem._id,
            closingDate: existingItem.created_time,
            campaign_Name: existingItem.campaign_Name,
            ad_Name: existingItem.ad_Name,
            custName: existingItem.name,
            custEmail: existingItem.email,
            custBussiness: existingItem.company_name,
            custNumb: existingItem.phone,
            state: existingItem.state,
            salesTeam: existingItem.salesTeam,
            projectStatus: ""
          };
          updatedItems.push(updatedItem);
        } else if (!salesLeadItem.salesTeam) {
          // Update salesTeam if not saved in salesLead
          salesLeadItem.salesTeam = existingItem.salesTeam;
          await salesLeadItem.save();
        }
      }
    }
    // Insert updated items into the salesLead collection
    if (updatedItems.length > 0) {
      await salesLead.insertMany(updatedItems);
    }
    res.json({ message: "Items Updated Successfully" });
  } catch (err) {
    res.json({ message: "All Leads are Transfered Before." });
  }
});

// Leads Data by Range

router.get('/leadsByRange/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      created_time: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await transferLead.find(query).sort({ created_time: -1 });
    res.json({ rangeTotalData: rangeTotalData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//get Teams Leads

router.get('/getTeams-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegex(name);

    const todayLeads = await salesLead.find({
      //salesTeam: personTeam,
      closingDate: {
        $gte: startOfToday,
        $lt: endOfToday
      },
      campaign_Name: { $regex: new RegExp(escapedName, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(todayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesTeamWork', async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const todayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    }).sort({ closingDate: -1 });
    return res.json(todayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

//get Yesterday Team Leads

router.get('/getYesterdayTeams-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
    const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59));

    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegex(name);

    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(escapedName, 'i') }
    }).sort({ closingDate: -1 });

    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesYesterdayTeamWork', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getOneYesterdayTeams-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);
    const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
    const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59));

    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegex(name);

    const yesterdayLeads = await salesLead.find({
      //salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(escapedName, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesOneYesterdayTeamWork', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getTwoYesterdayTeams-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
    const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59));

    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegex(name);

    const yesterdayLeads = await salesLead.find({
      //salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(escapedName, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesTwoYesterdayTeamWork', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getThreeYesterdayTeams-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 4);
    const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
    const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59));

    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegex(name);

    const yesterdayLeads = await salesLead.find({
      //salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(escapedName, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesThreeYesterdayTeamWork', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 4);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getFourYesterdayTeams-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 5);
    const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
    const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59));

    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegex(name);

    const yesterdayLeads = await salesLead.find({
      //salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(escapedName, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesFourYesterdayTeamWork', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 5);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getFiveYesterdayTeams-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 6);
    const startOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0));
    const endOfYesterday = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59));

    const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedName = escapeRegex(name);

    const yesterdayLeads = await salesLead.find({
      //salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(escapedName, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesFiveYesterdayTeamWork', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 6);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

//Get Current Month Team Sales Leads

router.get('/getSales-Leads', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const fetchedLeads = await Customer.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    }).sort({ closingDate: -1 });
    const previousMonthLeads = await Customer.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ closingDate: -1 });
    const previousTwoMonthLeads = await Customer.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 1)
      }
    }).sort({ closingDate: -1 });
    res.json({ fetchedLeads, previousMonthLeads, previousTwoMonthLeads });
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

// SalesLead by Range

router.get('/salesleadsByRange/:startDate/:endDate/:categ', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const categ = req.params.categ;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      //salesTeam: personTeam,
      campaign_Name: categ,
      closingDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await salesLead.find(query).sort({ closingDate: -1 });
    res.json({ rangeTotalData: rangeTotalData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/salesleadsByRange/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      //salesTeam: personTeam,
      closingDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await salesLead.find(query).sort({ closingDate: -1 });
    res.json({ rangeTotalData: rangeTotalData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/salesleadsByRangeAdmin/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await salesLead.find(query).sort({ closingDate: -1 });
    res.json({ rangeTotalData: rangeTotalData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//transfer Admin Leads

router.get('/transferLeads', async (req, res) => {
  try {
    const fbLead = await Lead.find();
    let successCount = 0;
    let skipCount = 0;
    let Sales = 0;
    for (doc of fbLead) {
      let existingLead = await transferLead.findOne({ created_time: doc.created_time });
      if (!existingLead) {
        const adminLead = new transferLead({
          id: doc.id,
          created_time: doc.created_time,
          campaign_Name: doc.campaign_Name,
          ad_Name: doc.ad_Name,
          name: doc.name,
          email: doc.email,
          company_name: doc.company_name,
          phone: doc.phone,
          state: doc.state,
          salesTeam: doc.salesTeam
        })
        await adminLead.save();
        successCount++;
      } else {
        const SalesLeadDoc = await salesLead.findOne({ closingDate: doc.created_time });
        Sales++;
        if (SalesLeadDoc && SalesLeadDoc.salesTeam) {
          existingLead.salesTeam = SalesLeadDoc.salesTeam;
          await existingLead.save();
        } else {
          skipCount++;
        }
      }
    }
    res.status(200).json({ success: true, message: "Data Transfer Successful", successCount: successCount, skipCount: skipCount, Sales: Sales });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//get All Admin Leads
router.get('/getAdmin-leads', async (req, res) => {
  try {
    const fetchedLeads = await transferLead.find().sort({ created_time: -1 });
    res.json(fetchedLeads);
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

//Update Editors

router.post('/updateEditor', async (req, res) => {
  try {
    const items = req.body.items;
    for (const item of items) {
      let existingItem = await Customer.findById(item._id);
      if (existingItem) {
        existingItem.editor = item.editor;
        existingItem.scriptWriter = item.scriptWriter;
        existingItem.voiceOver = item.voiceOver;
        existingItem.projectStatus = item.projectStatus;
        existingItem.scriptPassDate = item.scriptPassDate;
        existingItem.editorPassDate = item.editorPassDate;
        existingItem.voicePassDate = item.voicePassDate;
        existingItem.graphicDesigner = item.graphicDesigner;
        existingItem.graphicPassDate = item.graphicPassDate;
        existingItem.priority = item.priority;
        existingItem.graphicStatus = item.graphicStatus;
        existingItem.graphicDeliveryDate = item.graphicDeliveryDate;
        existingItem.bundleHandler = item.bundleHandler;
        existingItem.bundleStatus = item.bundleStatus;
        existingItem.bundlePassDate = item.bundlePassDate;
        await existingItem.save();
      }
    }
    res.json({ message: "Editor Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/updateSubEntry', async (req, res) => {
  try {
    const { parentId, subEntry } = req.body;
    const customer = await Customer.findById(parentId);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const sub = customer.subEntries.find(entry => entry.custCode === subEntry.custCode);
    if (!sub) return res.status(404).json({ message: 'Sub-entry not found' });

    Object.assign(sub, subEntry); // Update only the given fields
    await customer.save();

    res.json({ message: 'Sub-entry updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/updateB2bEditorname', async (req, res) => {
  try {
    const items = req.body.items;
    for (const item of items) {
      let existingItem = await B2bCustomer.findById(item._id);
      if (existingItem) {
        existingItem.b2bEditor = item.b2bEditor;
        existingItem.b2bEditorPassDate = item.b2bEditorPassDate;
        await existingItem.save();
      }
    }
    res.json({ message: "Editor updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Script writer Projects
router.get('/scriptProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    }).sort({ scriptPassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/scriptPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ scriptPassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/scriptTwoPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ scriptPassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/allScriptProjects', async (req, res) => {
  const allProjects = await Customer.find({ scriptWriter: person }).sort({ closingDate: -1 });
  if (allProjects) {
    return res.json(allProjects)
  } else {
    res.send({ result: "No Data Found" })
  }
});

router.get('/dataByDatePassRange/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      scriptWriter: person,
      scriptPassDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await Customer.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/todayEntriesScript', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/scriptActiveList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      scriptStatus: { $ne: 'Complete' }
    }).sort({ closingDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/scriptCompleteList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      scriptStatus: { $regex: /^Complete$/i }
    }).sort({ closingDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//Editor Projects

// router.get('/allEditorProjects', async (req, res) => {
//   const allProjects = (await Customer.find({ editor: person }).sort({ closingDate: -1 })).map(item => ({ ...item.toObject(), type: 'Customer' }));
//   const allB2bProjects = (await B2bCustomer.find({ b2bEditor: person }).sort({ b2bEditorPassDate: -1 })).map(item => ({ ...item.toObject(), type: 'b2b' }));
//   if (allProjects || allB2bProjects) {
//     return res.json({ list: [...allProjects, ...allB2bProjects] });
//   } else {
//     res.send({ result: "No Data Found" })
//   }
// });

router.get('/allEditorProjects', async (req, res) => {
  try {
    const isValidDate = (d) => d && !isNaN(new Date(d).getTime());

    const allProjects = [];
    const allB2bProjects = [];

    // Handle Customer entries
    const customerDocs = await Customer.find({}).sort({ closingDate: -1 });

    customerDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.editor === person && isValidDate(item.editorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        allProjects.push({
          ...item,
          type: 'Customer',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          allProjects.push({
            ...sub,
            type: 'Customer',
            parentCustCode: item.custCode
          });
        });
      }
    });

    // Handle B2B entries
    const b2bDocs = await B2bCustomer.find({}).sort({ b2bEditorPassDate: -1 });

    b2bDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.b2bEditor === person && isValidDate(item.b2bEditorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        allB2bProjects.push({
          ...item,
          type: 'b2b',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          allB2bProjects.push({
            ...sub,
            type: 'b2b',
            parentCustCode: item.custCode
          });
        });
      }
    });

    if (allProjects.length || allB2bProjects.length) {
      return res.json({ list: [...allProjects, ...allB2bProjects] });
    } else {
      res.send({ result: "No Data Found" });
    }

  } catch (error) {
    console.error("Error Fetching All Editor Projects", error);
    res.status(500).json({ error: 'Failed to Fetch All Projects' });
  }
});


// router.get('/editorProjects', async (req, res) => {
//   try {
//     //const currentMonth = new Date().getMonth() + 1;
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
//     const allProjects = (await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: startOfMonth,
//         $lte: endOfToday
//       }
//     }).sort({ editorPassDate: -1 })).map(item => ({ ...item.toObject(), type: 'Customer', subEntries: item.subEntries || [] }));

//     const allB2bProjects = (await B2bCustomer.find({
//       b2bEditor: person,
//       b2bEditorPassDate: {
//         $gte: startOfMonth,
//         $lte: endOfToday
//       }
//     }).sort({ b2bEditorPassDate: -1 })).map(item => ({ ...item.toObject(), type: 'b2b',subEntries: item.subEntries || [] }));
//     return res.json({ list: [...allProjects, ...allB2bProjects] })
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to Fetch Leads' })
//   }
// });

router.get('/editorProjects', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const isValidDate = (d) => d && new Date(d) >= startOfMonth && new Date(d) <= endOfToday;

    // Handle Customer Projects
    const customerDocs = await Customer.find({}).sort({ editorPassDate: -1 });
    const allProjects = [];

    customerDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.editor === person && isValidDate(item.editorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        // Include full main entry with its valid sub-entries
        allProjects.push({
          ...item,
          type: 'Customer',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        // Only push valid sub-entries individually
        validSubEntries.forEach(sub => {
          allProjects.push({
            ...sub,
            type: 'Customer',
            parentCustCode: item.custCode // optional for context
          });
        });
      }
    });

    // Handle B2B Projects
    const b2bDocs = await B2bCustomer.find({}).sort({ b2bEditorPassDate: -1 });
    const allB2bProjects = [];

    b2bDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.b2bEditor === person && isValidDate(item.b2bEditorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        allB2bProjects.push({
          ...item,
          type: 'b2b',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          allB2bProjects.push({
            ...sub,
            type: 'b2b',
            parentCustCode: item.custCode
          });
        });
      }
    });

    return res.json({ list: [...allProjects, ...allB2bProjects] });

  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' });
  }
});

// router.get('/editorPreviousProjects', async (req, res) => {
//   try {
//     const currentMonth = new Date().getMonth() + 1;
//     const allProjects = (await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
//       }
//     }).sort({ editorPassDate: -1 })).map(item => ({ ...item.toObject(), type: 'Customer' }));

//     const b2bProducts = (await B2bCustomer.find({
//       b2bEditor: person,
//       b2bEditorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
//       }
//     }).sort({ b2bEditorPassDate: -1 })).map(item => ({ ...item.toObject(), type: 'b2b' }));
//     return res.json({ list: [...allProjects, ...b2bProducts] })
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to Fetch Leads' })
//   }
// });

router.get('/editorPreviousProjects', async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999); // last day of previous month

    const isValidDate = (d) => d && new Date(d) >= prevMonthStart && new Date(d) <= prevMonthEnd;

    const allProjects = [];
    const allB2bProjects = [];

    // Customer Entries
    const customerDocs = await Customer.find({}).sort({ editorPassDate: -1 });

    customerDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.editor === person && isValidDate(item.editorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        allProjects.push({
          ...item,
          type: 'Customer',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          allProjects.push({
            ...sub,
            type: 'Customer',
            parentCustCode: item.custCode
          });
        });
      }
    });

    // B2B Entries
    const b2bDocs = await B2bCustomer.find({}).sort({ b2bEditorPassDate: -1 });

    b2bDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.b2bEditor === person && isValidDate(item.b2bEditorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        allB2bProjects.push({
          ...item,
          type: 'b2b',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          allB2bProjects.push({
            ...sub,
            type: 'b2b',
            parentCustCode: item.custCode
          });
        });
      }
    });

    return res.json({ list: [...allProjects, ...allB2bProjects] });
  } catch (error) {
    console.error("Error Fetching Previous Projects", error);
    res.status(500).json({ error: 'Failed to Fetch Previous Projects' });
  }
});

// router.get('/editorTwoPreviousProjects', async (req, res) => {
//   try {
//     const currentMonth = new Date().getMonth() + 1;
//     const allProjects = (await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
//       }
//     }).sort({ editorPassDate: -1 })).map(item => ({ ...item.toObject(), type: 'Customer' }));

//     const b2bProducts = (await B2bCustomer.find({
//       b2bEditor: person,
//       b2bEditorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
//       }
//     }).sort({ b2bEditorPassDate: -1 })).map(item => ({ ...item.toObject(), type: 'b2b' }));
//     return res.json({ list: [...allProjects, ...b2bProducts] })
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to Fetch Leads' })
//   }
// });

router.get('/editorTwoPreviousProjects', async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const twoPrevMonthStart = new Date(currentYear, currentMonth - 2, 1);
    const twoPrevMonthEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59, 999); // last day of 2nd previous month

    const isValidDate = (d) => d && new Date(d) >= twoPrevMonthStart && new Date(d) <= twoPrevMonthEnd;

    const allProjects = [];
    const allB2bProjects = [];

    // Customer Entries
    const customerDocs = await Customer.find({}).sort({ editorPassDate: -1 });

    customerDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.editor === person && isValidDate(item.editorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        allProjects.push({
          ...item,
          type: 'Customer',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          allProjects.push({
            ...sub,
            type: 'Customer',
            parentCustCode: item.custCode
          });
        });
      }
    });

    // B2B Entries
    const b2bDocs = await B2bCustomer.find({}).sort({ b2bEditorPassDate: -1 });

    b2bDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid = item.b2bEditor === person && isValidDate(item.b2bEditorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person && isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        allB2bProjects.push({
          ...item,
          type: 'b2b',
          subEntries: validSubEntries
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          allB2bProjects.push({
            ...sub,
            type: 'b2b',
            parentCustCode: item.custCode
          });
        });
      }
    });

    return res.json({ list: [...allProjects, ...allB2bProjects] });
  } catch (error) {
    console.error("Error Fetching Two-Previous Projects", error);
    res.status(500).json({ error: 'Failed to Fetch Projects' });
  }
});


router.get('/dataByDatePassRangeEditor/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      editor: person,
      companyName: "AdmixMedia",
      editorPassDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await Customer.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/todayEntriesEditor', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      editor: person,
      editorPassDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// router.get('/editorActiveList', async (req, res) => {
//   const currentMonth = new Date().getMonth() + 1;
//   try {
//     const products = (await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
//       },
//       editorStatus: { $ne: 'Completed' }
//     }).sort({ closingDate: -1 })).map(item => ({ ...item.toObject(), type: 'Customer' }));

//     const b2bProducts = (await B2bCustomer.find({
//       b2bEditor: person,
//       b2bProjectDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
//       },
//       projectStatus: { $ne: 'Completed' }
//     }).sort({ closingDate: -1 })).map(item => ({ ...item.toObject(), type: 'b2b' }));
//     res.json({ products, b2bProducts });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });

router.get('/editorActiveList', async (req, res) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const isWithinRange = (date) =>
    date && new Date(date) >= startDate && new Date(date) <= endDate;

  try {
    // Get customers where either main or any subEntry is not completed
    const customerDocs = await Customer.find({
      $or: [
        { editorStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ closingDate: -1 });

    const b2bDocs = await B2bCustomer.find({
      $or: [
        { projectStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ closingDate: -1 });

    const products = [];
    const b2bProducts = [];

    // Process Customer documents
    customerDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid =
        item.editor === person &&
        item.editorStatus !== 'Completed' &&
        isWithinRange(item.editorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isWithinRange(sub.editorPassDate)
      );

      if (mainValid) {
        products.push({
          ...item,
          subEntries: validSubEntries,
          type: 'Customer'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          products.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'Customer'
          });
        });
      }
    });

    // Process B2bCustomer documents
    b2bDocs.forEach(doc => {
      const item = doc.toObject();

      const mainValid =
        item.b2bEditor === person &&
        item.projectStatus !== 'Completed' &&
        isWithinRange(item.b2bProjectDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isWithinRange(sub.editorPassDate)
      );

      if (mainValid) {
        b2bProducts.push({
          ...item,
          subEntries: validSubEntries,
          type: 'b2b'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          b2bProducts.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'b2b'
          });
        });
      }
    });

    res.json({ products, b2bProducts });
  } catch (error) {
    console.error("Error fetching editor active list:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// router.get('/editorCompleteList', async (req, res) => {
//   const currentMonth = new Date().getMonth() + 1;
//   try {
//     const products = (await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
//       },
//       editorStatus: { $regex: /^Completed$/i }
//     }).sort({ closingDate: -1 })).map(item => ({ ...item.toObject(), type: 'Customer' }));

//     const b2bProducts = (await B2bCustomer.find({
//       b2bEditor: person,
//       b2bProjectDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth + 1, 0)
//       },
//       projectStatus: { $regex: /^Completed$/i }
//     }).sort({ b2bProjectDate: -1 })).map(item => ({ ...item.toObject(), type: 'b2b' }));
//     res.json({ products, b2bProducts });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });

router.get('/editorCompleteList', async (req, res) => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const isWithinRange = (date) => date && new Date(date) >= startDate && new Date(date) <= endDate;

  try {
    const customerDocs = await Customer.find({
      $or: [
        { editorStatus: { $regex: /^Completed$/i } },
        { subEntries: { $elemMatch: { editorStatus: { $regex: /^Completed$/i } } } }
      ]
    }).sort({ closingDate: -1 });

    const b2bDocs = await B2bCustomer.find({
      $or: [
        { projectStatus: { $regex: /^Completed$/i } },
        { subEntries: { $elemMatch: { editorStatus: { $regex: /^Completed$/i } } } }
      ]
    }).sort({ b2bProjectDate: -1 });

    const products = [];
    const b2bProducts = [];

    // Customer documents
    customerDocs.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.editor === person &&
        /^Completed$/i.test(item.editorStatus) &&
        isWithinRange(item.editorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        /^Completed$/i.test(sub.editorStatus) &&
        isWithinRange(sub.editorPassDate)
      );

      if (mainValid) {
        products.push({ ...item, subEntries: validSubEntries, type: 'Customer' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          products.push({ ...sub, parentCustCode: item.custCode, type: 'Customer' });
        });
      }
    });

    // B2B documents
    b2bDocs.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.b2bEditor === person &&
        /^Completed$/i.test(item.projectStatus) &&
        isWithinRange(item.b2bProjectDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        /^Completed$/i.test(sub.editorStatus) &&
        isWithinRange(sub.editorPassDate)
      );

      if (mainValid) {
        b2bProducts.push({ ...item, subEntries: validSubEntries, type: 'b2b' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          b2bProducts.push({ ...sub, parentCustCode: item.custCode, type: 'b2b' });
        });
      }
    });

    res.json({ products, b2bProducts });
  } catch (error) {
    console.error("Error fetching editor complete list:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//other company Editor Projects

router.get('/alleditorOtherProjects', async (req, res) => {
  const allProjects = await B2bCustomer.find({ b2bEditor: person, companyName: { $ne: "AdmixMedia" } }).sort({ b2bProjectDate: -1 });
  if (allProjects) {
    return res.json(allProjects)
  } else {
    res.send({ result: "No Data Found" })
  }
});

router.get('/editorProjectsOther', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await B2bCustomer.find({
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    }).sort({ b2bProjectDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/editorPreviousOtherProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await B2bCustomer.find({
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ b2bProjectDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/editorTwoPreviousOtherProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await B2bCustomer.find({
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ b2bProjectDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/dataByDatePassRangeEditorOther/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await B2bCustomer.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/todayEntriesEditorOther', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await B2bCustomer.find(query);
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/editorOtherActiveList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await B2bCustomer.find({
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      projectStatus: { $ne: 'Completed' }
    }).sort({ b2bProjectDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/editorOtherCompleteList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await B2bCustomer.find({
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      projectStatus: { $regex: /^Completed$/i }
    }).sort({ b2bProjectDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// VoiceOver Projects

router.get('/voProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      voiceOver: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    }).sort({ voicePassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/voPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      voiceOver: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ voicePassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/voTwoPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      voiceOver: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ voicePassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/allVoProjects', async (req, res) => {
  const allProjects = await Customer.find({ voiceOver: person }).sort({ closingDate: -1 });
  if (allProjects) {
    return res.json(allProjects)
  } else {
    res.send({ result: "No Data Found" })
  }
});

router.get('/dataByDatePassRangeVo/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      voiceOver: person,
      voicePassDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await Customer.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/todayEntriesVo', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/voActiveList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      voiceOverStatus: { $ne: 'Complete' }
    }).sort({ closingDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/voCompleteList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      voiceOverStatus: { $regex: /^Complete$/i }
    }).sort({ closingDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// update Project Status from Admin Panel

router.post('/update-projectStatus', checkAuth, async (req, res) => {
  try {
    const person1 = req.userData?.name;
    const items = req.body.items;
    for (const item of items) {
      let existingItem = await salesLead.findById(item._id);
      if (existingItem) {
        existingItem.projectStatus = item.projectStatus;
        existingItem.remark = item.remark;
        existingItem.custBussiness = item.custBussiness;
        existingItem.followup1 = item.followup1;
        existingItem.followup2 = item.followup2;
        existingItem.followup3 = item.followup3;
        existingItem.followup4 = item.followup4;
        existingItem.callReminderDate = item.callReminderDate;
        existingItem.salesPerson = person1;
        await existingItem.save();
      }
    }
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
});

//Leads Reminder

const reminder = async () => {
  try {
    const now = new Date();
    now.setSeconds(0, 0);
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1);

    const leads = await salesLead.find({
      callReminderDate: {
        $gte: now,
        $lt: nextMinute
      }
    });

    leads.forEach(lead => {
      console.log(`Reminder: Call ${lead.custName} at ${lead.custNumb}`);
      io.to(lead.salesPerson).emit('call-reminder', {
        name: lead.custName,
        number: lead.custNumb,
        time: lead.callReminderDate,
      });
    });
  } catch (error) {
    console.error('Error Reminder: ', error.message);
  }
};

//random quotes

router.get('/quotes', async (req, res) => {
  try {
    const api_url = "https://api.quotable.io/random";
    const response = await fetch(api_url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
});

// b2b

router.post('/b2bProject', async (req, res) => {
  const customer = new B2bCustomer({
    b2bProjectCode: req.body.b2bProjectCode,
    companyName: req.body.companyName,
    b2bProjectName: req.body.b2bProjectName,
    b2bCategory: req.body.b2bCategory,
    b2bVideoType: req.body.b2bVideoType,
    b2bProjectDate: req.body.b2bProjectDate,
    b2bProjectPrice: req.body.b2bProjectPrice,
    b2bBillType: req.body.b2bBillType,
    b2bVideoDurationMinutes: req.body.b2bVideoDurationMinutes,
    b2bVideoDurationSeconds: req.body.b2bVideoDurationSeconds,
    b2bEditor: req.body.b2bEditor,
    youtubeLink: req.body.youtubeLink,
    b2bRemark: req.body.b2bRemark,
    salesPerson: req.body.salesPerson,
    salesTeam: req.body.salesTeam,
    projectStatus: req.body.projectStatus,
    b2bRemainingAmount: req.body.b2bRemainingAmount,
    b2bAdvanceAmount: req.body.b2bAdvanceAmount,
    b2bRestAmount: req.body.b2bRestAmount
  })
  await customer.save().then((_) => {
    res.json({ success: true, message: "B2b Project Added!!" })
  }).catch((err) => {
    res.json({ success: false, message: "B2b Project Not Added!!" })
  })
});

router.get('/b2bDataLength', async (req, res) => {
  const dataLength = await B2bCustomer.countDocuments();
  return res.json(dataLength);
});

router.get('/totalEntriesB2b', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let query;
    query = {
      b2bProjectDate: {
        $gte: startOfMonth,
        $lte: endOfToday
      }
    };
    const totalEntries = await B2bCustomer.find(query);
    const totalAmount = totalEntries.reduce((sum, doc) => sum + doc.b2bProjectPrice, 0);
    // const totalRecv = totalEntries.reduce((sum, doc) => sum + doc.AdvPay + doc.restAmount, 0);
    // const totalDue = totalEntries.reduce((sum, doc) => sum + doc.remainingAmount, 0);
    // res.json({ totalEntries, totalAmount, totalRecv, totalDue });
    res.json({ totalEntries, totalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allTotalEntriesB2b', async (req, res) => {
  try {
    // let query;
    // query = {
    //   salesPerson: person,
    // };
    const totalEntries = await B2bCustomer.find();
    const totalAmount = totalEntries.reduce((sum, doc) => sum + doc.b2bProjectPrice, 0);
    // const totalRecv = totalEntries.reduce((sum, doc) => sum + doc.AdvPay + doc.restAmount, 0);
    // const totalDue = totalEntries.reduce((sum, doc) => sum + doc.remainingAmount, 0);
    // res.json({ totalEntries, totalAmount, totalRecv, totalDue });
    res.json({ totalEntries, totalAmount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/listB2b', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await B2bCustomer.find({
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      projectStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });
    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allListB2b', async (req, res) => {
  try {
    const products = await B2bCustomer.find({
      projectStatus: { $ne: 'Completed' }
    }).sort({ b2bProjectDate: -1 });
    if (products.length > 0) {
      res.json(products);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/completeProjectB2b', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const completeProducts = await B2bCustomer.find({
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      projectStatus: { $regex: /^Completed$/i }
    }).sort({ closingDate: -1 });
    if (completeProducts.length > 0) {
      res.json(completeProducts);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allCompleteProjectB2b', async (req, res) => {
  try {
    const completeProducts = await B2bCustomer.find({
      projectStatus: { $regex: /^Completed$/i }
    }).sort({ b2bProjectDate: -1 });
    if (completeProducts.length > 0) {
      res.json(completeProducts);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalPreviousEntriesB2b', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    };
    const totalEntries = await B2bCustomer.find(query);
    res.json(totalEntries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/totalTwoPreviousEntriesB2b', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 1)
      }
    };
    const totalEntries = await B2bCustomer.find(query);
    res.json(totalEntries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/B2bProjectName/:projectName', async (req, res) => {
  let data = await B2bCustomer.find(
    { b2bProjectName: { $regex: req.params.projectName } }
  )
  res.send(data);
});

router.get('/dataByDateB2b/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      salesPerson: person,
      b2bProjectDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await B2bCustomer.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.delete('/delete-B2b/:id', async (req, res) => {
  try {
    const deleteCust = await B2bCustomer.findByIdAndDelete(req.params.id);
    if (deleteCust) {
      return res.json(deleteCust);
    } else {
      return res.json({ result: "No Data Deleted" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/downloadFileB2b', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    };

    const customers = await B2bCustomer.find(query);
    const data = customers.map(customer => ({
      'ProjectCode': customer.b2bProjectCode,
      'ProjectName': customer.companyName,
      'CompanyName': customer.b2bProjectName,
      'Category': customer.b2bCategory,
      'VideoType': customer.b2bVideoType,
      'ProjectDate': customer.b2bProjectDate,
      'ProjectPrice': customer.b2bProjectPrice,
      'BillType': customer.b2bBillType,
      'DurationMinutes': customer.b2bVideoDurationMinutes,
      'DurationSeconds': customer.b2bVideoDurationMinutes,
      'Editor': customer.b2bEditor,
      'YoutubeLink': customer.youtubeLink,
      'Remark': customer.b2bRemark,
      'SalesPerson': customer.salesPerson,
      'ProjectStatus': customer.projectStatus,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch (err) {
    console.error('Error Downloading File', err);
    res.status(500).json({ error: 'Failed to download File' });
  }
});

router.get('/downloadRangeFileB2b/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query;
    query = {
      b2bProjectDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeFileData = await B2bCustomer.find(query);
    const data = rangeFileData.map(customer => ({
      'ProjectCode': customer.b2bProjectCode,
      'ProjectName': customer.companyName,
      'CompanyName': customer.b2bProjectName,
      'Category': customer.b2bCategory,
      'VideoType': customer.b2bVideoType,
      'ProjectDate': customer.b2bProjectDate,
      'ProjectPrice': customer.b2bProjectPrice,
      'BillType': customer.billType,
      'DurationMinutes': customer.b2bVideoDurationMinutes,
      'DurationSeconds': customer.b2bVideoDurationMinutes,
      'Editor': customer.b2bEditor,
      'YoutubeLink': customer.youtubeLink,
      'Remark': customer.b2bRemark,
      'SalesPerson': customer.salesPerson,
      'ProjectStatus': customer.projectStatus,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch (err) {
    console.error('Error Downloading File', err);
    res.status(500).json({ error: 'Failed to download File' });
  }
});

router.get('/read-b2b/:id', async (req, res) => {
  try {
    // Search in the Customer collection
    const customerDetails = await B2bCustomer.findById(req.params.id);
    // Check if any data found in either collection
    if (customerDetails) {
      return res.json(customerDetails);
    } else {
      return res.json({ result: "No Data" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/updateB2b/:id', async (req, res) => {
  const EmpDet = await B2bCustomer.findByIdAndUpdate(req.params.id, {
    $set: req.body
  })
  if (EmpDet) {
    return res.json(EmpDet)
  } else {
    res.send({ result: "No Employee Found" })
  }
});

router.put('/updateB2bEditor/:id', async (req, res) => {
  const custDet = await B2bCustomer.findByIdAndUpdate(req.params.id, {
    $set: req.body
  })
  if (custDet) {
    return res.json(custDet)
  } else {
    res.send({ result: "No No Data" })
  }
});

// New Custom Sales LEad

router.post('/customLead', async (req, res) => {
  try {
    const customer = new salesLead({
      campaign_Name: req.body.campaign_Name,
      closingDate: req.body.closingDate,
      custName: req.body.custName,
      custEmail: req.body.custEmail,
      custBussiness: req.body.custBussiness,
      custNumb: req.body.custNumb,
      state: req.body.state,
      salesTeam: 'Sales Team 1',
      salesPerson: req.body.salesPerson,
      leadsCreatedDate: req.body.leadsCreatedDate,
      companyName: req.body.companyName,
      projectStatus: req.body.projectStatus,
      remark: req.body.remark
    })
    await customer.save();
    function formatDate(timestamp) {
      const date = new Date(timestamp);
      const day = String(date.getDate()).padStart(2, '0'); // Get day with leading zero if necessary
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month with leading zero if necessary
      const year = String(date.getFullYear()).slice(-2);
      return `${day}${month}${year}`;
    }
    const contact = {
      names: [{ givenName: `${formatDate(req.body.closingDate)} ${req.body.custName}` }],
      emailAddresses: [{ value: req.body.custEmail }],
      phoneNumbers: [{ value: req.body.custNumb.toString() }],
      organizations: [{
        name: req.body.companyName,
        title: req.body.custBussiness
      }]
    };
    const response = await people.people.createContact({
      requestBody: contact
    });
    if (response.status === 200) {
      res.json({ success: true, message: "New Lead & Contact Added!!" })
    } else {
      console.error("Error creating contact:", response.statusText);
      res.json({ success: false, message: "New Lead Added, but Contact Not Created!" });
    }
  } catch (err) {
    console.error("Error adding lead and contact:", err);
    res.json({ success: false, message: "Error Adding Lead and Contact!" })
  }
});

//update SalesTeam of Leads

router.get('/updateSalesTeam', async (req, res) => {
  try {
    const query = { salesTeam: { $exists: false } };
    const update = { $set: { salesTeam: personTeam } };
    const options = { multi: true }; // This will update multiple documents
    const result = await salesLead.updateMany(query, update, options);
    return (result.modifiedCount);
  } catch (err) {
    console.error(err);
  }
});

//Payroll System

router.get('/dataByTm/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: { $gte: startDate, $lte: endDate },
      $or: [
        { editor: tmName },
        { scriptWriter: tmName },
        { voiceOver: tmName }
      ]
    };
    const totalData = await Customer.find(query);
    res.json(totalData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/dataByEditorPayment/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query1 = {
      closingDate: { $gte: startDate, $lte: endDate },
      editor: tmName,
      editorStatus: { $regex: /^Completed$/i }
    };
    const completeProjects = await Customer.find(query1);
    let query2 = {
      closingDate: { $gte: startDate, $lte: endDate },
      editor: tmName,
      editorStatus: { $ne: 'Completed' }
    }
    const inCompleteProjects = await Customer.find(query2);
    let query3 = {
      closingDate: { $gte: startDate, $lte: endDate },
      editor: tmName,
      EditorPaymentStatus: { $ne: 'Transfered' },
      editorStatus: { $regex: /^Completed$/i }
    }
    const totalData = await Customer.find(query3);
    const paybalAmount = totalData.reduce((sum, doc) => sum + doc.totalEditorPayment, 0);
    res.json({ completeProjects, inCompleteProjects, paybalAmount });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/dataByScriptPayment/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query1 = {
      closingDate: { $gte: startDate, $lte: endDate },
      scriptWriter: tmName,
      scriptStatus: { $regex: /^Complete$/i }
    };
    const completeProjects = await Customer.find(query1);
    let query2 = {
      closingDate: { $gte: startDate, $lte: endDate },
      scriptWriter: tmName,
      scriptStatus: { $ne: 'Complete' }
    }
    const inCompleteProjects = await Customer.find(query2);
    let query3 = {
      closingDate: { $gte: startDate, $lte: endDate },
      scriptWriter: tmName,
      scriptStatus: { $regex: /^Complete$/i },
      ScriptPaymentStatus: { $ne: 'Transfered' }
    }
    const totalData = await Customer.find(query3);
    const paybalAmount = totalData.reduce((sum, doc) => sum + doc.totalScriptPayment, 0);
    res.json({ completeProjects, inCompleteProjects, paybalAmount });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/dataByVoPayment/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query1 = {
      closingDate: { $gte: startDate, $lte: endDate },
      voiceOver: tmName,
      voiceOverStatus: { $regex: /^Complete$/i }
    };
    const completeProjects = await Customer.find(query1);
    let query2 = {
      closingDate: { $gte: startDate, $lte: endDate },
      voiceOver: tmName,
      voiceOverStatus: { $ne: 'Complete' }
    }
    const inCompleteProjects = await Customer.find(query2);
    let query3 = {
      closingDate: { $gte: startDate, $lte: endDate },
      voiceOver: tmName,
      voiceOverStatus: { $regex: /^Complete$/i },
      VoiceOverPaymentStatus: { $ne: 'Transfered' }
    }
    const totalData = await Customer.find(query3);
    const paybalAmount = totalData.reduce((sum, doc) => sum + doc.totalVoicePayment, 0);
    res.json({ completeProjects, inCompleteProjects, paybalAmount });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

//update Payroll Payment

router.put('/editorPayrollUpdate/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: { $gte: startDate, $lte: endDate },
      editor: tmName,
      editorStatus: { $regex: /^Completed$/i }
    };
    const update = {
      $set: { EditorCNR: req.body.EditorCNR, EditorPaymentStatus: req.body.EditorPaymentStatus, editorPaymentDate: req.body.editorPaymentDate }
    };
    const result = await Customer.updateMany(query, update);

    const payrollData = new Payroll({
      startDate: startDate,
      endDate: endDate,
      tmName: tmName,
      EditorPaymentStatus: req.body.EditorPaymentStatus,
      EditorCNR: req.body.EditorCNR,
      editorPaymentDate: req.body.editorPaymentDate,
      PaybalAmount: req.body.EditorPaybalPayment,
      companyName: req.body.companyName,
      Role: req.body.payrollRole
    });
    await payrollData.save();
    res.json({ message: "Payroll Successfull" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.put('/editorPayrollUpdateScript/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: { $gte: startDate, $lte: endDate },
      scriptWriter: tmName,
      scriptStatus: { $regex: /^Complete$/i }
    };
    const update = {
      $set: { ScriptCNR: req.body.ScriptCNR, ScriptPaymentStatus: req.body.ScriptPaymentStatus, scriptPaymentDate: req.body.scriptPaymentDate }
    };
    const result = await Customer.updateMany(query, update);

    const payrollData = new Payroll({
      startDate: startDate,
      endDate: endDate,
      tmName: tmName,
      ScriptPaymentStatus: req.body.ScriptPaymentStatus,
      ScriptCNR: req.body.ScriptCNR,
      scriptPaymentDate: req.body.scriptPaymentDate,
      PaybalAmount: req.body.ScriptPaybalPayment,
      Role: req.body.payrollRole
    });
    await payrollData.save();
    res.json({ message: "Payroll Successfull" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.put('/editorPayrollUpdateVo/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: { $gte: startDate, $lte: endDate },
      voiceOver: tmName,
      voiceOverStatus: { $regex: /^Complete$/i }
    };
    const update = {
      $set: { VoCNR: req.body.VoCNR, voiceOverPaymentDate: req.body.voiceOverPaymentDate, voiceOverPaymentStatus: req.body.voiceOverPaymentStatus }
    };
    const result = await Customer.updateMany(query, update);

    const payrollData = new Payroll({
      startDate: startDate,
      endDate: endDate,
      tmName: tmName,
      VoiceOverPaymentStatus: req.body.VoiceOverPaymentStatus,
      VoCNR: req.body.VoCNR,
      voiceOverPaymentDate: req.body.voiceOverPaymentDate,
      PaybalAmount: req.body.VoPaybalPayment,
      Role: req.body.payrollRole
    });
    await payrollData.save();
    res.json({ message: "Payroll Successfull" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/editorPayroll', async (req, res) => {
  try {
    const allData = await Payroll.find({
      tmName: person
    });
    if (allData.length > 0) {
      res.json(allData);
    } else {
      res.json({ result: "No Data Found" })
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/editorPayroll/:EditorCNR', async (req, res) => {
  let data = await Payroll.find(
    { EditorCNR: { $regex: req.params.EditorCNR } }
  )
  res.send(data);
});

router.get('/payrollByDatePassRangeEditor/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      tmName: person,
      editorPaymentDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await Payroll.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/scriptPayroll', async (req, res) => {
  try {
    const allData = await Payroll.find({
      tmName: person
    });
    if (allData.length > 0) {
      res.json(allData);
    } else {
      res.json({ result: "No Data Found" })
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/scriptPayroll/:ScriptCNR', async (req, res) => {
  let data = await Payroll.find(
    { ScriptCNR: { $regex: req.params.ScriptCNR } }
  )
  res.send(data);
});

router.get('/payrollByDatePassRangeScript/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      tmName: person,
      scriptPaymentDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await Payroll.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/voPayroll', async (req, res) => {
  try {
    const allData = await Payroll.find({
      tmName: person
    });
    if (allData.length > 0) {
      res.json(allData);
    } else {
      res.json({ result: "No Data Found" })
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/voPayroll/:VoCNR', async (req, res) => {
  let data = await Payroll.find(
    { VoCNR: { $regex: req.params.VoCNR } }
  )
  res.send(data);
});

router.get('/payrollByDatePassRangeVo/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      tmName: person,
      voiceOverPaymentDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await Payroll.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

//B2b Payroll

router.get('/dataByTmB2b/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      b2bProjectDate: { $gte: startDate, $lte: endDate },
      b2bEditor: tmName
    };
    const totalData = await B2bCustomer.find(query);
    res.json(totalData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/dataByEditorPaymentB2b/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query1 = {
      b2bProjectDate: { $gte: startDate, $lte: endDate },
      b2bEditor: tmName,
      projectStatus: { $regex: /^Completed$/i }
    };
    const completeProjects = await B2bCustomer.find(query1);
    let query2 = {
      b2bProjectDate: { $gte: startDate, $lte: endDate },
      b2bEditor: tmName,
      projectStatus: { $ne: 'Completed' }
    }
    const inCompleteProjects = await B2bCustomer.find(query2);
    let query3 = {
      b2bProjectDate: { $gte: startDate, $lte: endDate },
      b2bEditor: tmName,
      EditorPaymentStatus: { $ne: 'Transfered' },
      projectStatus: { $regex: /^Completed$/i }
    }
    const totalData = await B2bCustomer.find(query3);
    const paybalAmount = totalData.reduce((sum, doc) => sum + doc.totalEditorPayment, 0);
    res.json({ completeProjects, inCompleteProjects, paybalAmount });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.put('/editorPayrollUpdateB2b/:startDate/:endDate/:tmName', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      b2bProjectDate: { $gte: startDate, $lte: endDate },
      b2bEditor: tmName,
      projectStatus: { $regex: /^Completed$/i }
    };
    const update = {
      $set: { EditorCNR: req.body.EditorCNR, EditorPaymentStatus: req.body.EditorPaymentStatus, editorPaymentDate: req.body.editorPaymentDate }
    };
    const result = await B2bCustomer.updateMany(query, update);

    const payrollData = new Payroll({
      startDate: startDate,
      endDate: endDate,
      tmName: tmName,
      EditorPaymentStatus: req.body.EditorPaymentStatus,
      EditorCNR: req.body.EditorCNR,
      editorPaymentDate: req.body.editorPaymentDate,
      PaybalAmount: req.body.EditorPaybalPayment,
      companyName: req.body.companyName
    });
    await payrollData.save();
    res.json({ message: "Payroll Successfull" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/allPayroll', async (req, res) => {
  try {
    const allData = await Payroll.find();
    if (allData.length > 0) {
      res.json(allData);
    } else {
      res.json({ result: "No Data Found" })
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/payrollByDatePassRangeEditorAll/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      $or: [
        {
          editorPaymentDate: {
            $gte: startDate, $lte: endDate
          }
        },
        { scriptPaymentDate: { $gte: startDate, $lte: endDate } },
        { voiceOverPaymentDate: { $gte: startDate, $lte: endDate } }
      ]
    };
    const rangeTotalData = await Payroll.find(query);
    res.json(rangeTotalData);
  } catch (error) {
    conosle.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.get('/payrollAll/:EditorCNR', async (req, res) => {
  try {
    let query = {
      $or: [
        { ScriptCNR: { $regex: req.params.EditorCNR } },
        { EditorCNR: { $regex: req.params.EditorCNR } },
        { VoCNR: { $regex: req.params.EditorCNR } },
      ]
    }
    let data = await Payroll.find(query);
    res.send(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// get WhatsApp Leads

router.get('/getWhatsApp-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const todayLeads = await salesLead.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: startOfToday,
        $lt: endOfToday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(todayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getYesterdayWhatsApp-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getOneYesterdayWhatsApp-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getTwoYesterdayWhatsApp-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getThreeYesterdayWhatsApp-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 4);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getFourYesterdayWhatsApp-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 5);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getFiveYesterdayWhatsApp-leads/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 6);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// est Invoice

// router.post('/estInvoice', async (req, res) => {
//   try {
//     const {
//       custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType, custName, custNumb, invoiceCateg, customCateg,
//       rows, invoiceDate, GSTAmount, totalAmount, billFormat, financialYear, discountValue, afterDiscountTotal, state, allowUpdate // Added to handle duplicate logic
//     } = req.body;
//     // Parse the invoiceDate to check for the current month and year
//     const currentMonth = new Date(invoiceDate).getMonth();
//     const currentYear = new Date(invoiceDate).getFullYear();
//     // Check if an invoice exists for the current month
//     const existingInvoice = await EstInvoice.findOne({
//       custName,
//       custNumb,
//       $expr: {
//         $and: [
//           { $eq: [{ $month: "$date" }, currentMonth + 1] }, // MongoDB months are 1-based
//           { $eq: [{ $year: "$date" }, currentYear] }
//         ]
//       }
//     });
//     if (existingInvoice && !allowUpdate) {
//       // Send a response indicating data already exists
//       return res.json({
//         success: false,
//         message: "Invoice of the User is already exists in this Month. Do you want to save this as a new entry?",
//         dataExists: true
//       });
//     }
//     if (existingInvoice && allowUpdate) {
//       Object.assign(existingInvoice, {
//         custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType, invoiceCateg, customCateg, rows,
//         //date: invoiceDate,
//         GSTAmount, totalAmount, billFormat, discountValue, afterDiscountTotal, state
//       });
//       await existingInvoice.save();
//       return res.json({ success: true, message: 'Invoice Updated Successfully' });
//     }
//     // Save the new invoice
//     const estInvoice = new EstInvoice({
//       custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType, custName, custNumb, invoiceCateg,
//       customCateg, rows, date: invoiceDate, GSTAmount, totalAmount, billFormat, financialYear, discountValue, afterDiscountTotal, state
//     });
//     await estInvoice.save();
//     res.json({ success: true, message: 'Invoice Created Successfully' });
//   } catch (err) {
//     console.error("Error saving/Updating Invoice Details", err);
//     res.json({ success: false, message: "Error Saving Invoice" });
//   }
// });

// router.post('/estInvoice', async (req, res) => {
//   try {
//     const {
//       custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType, custName, custNumb, invoiceCateg,
//       customCateg, rows, invoiceDate, GSTAmount, totalAmount, billFormat, financialYear, discountValue,
//       afterDiscountTotal, state, allowUpdate, allowNewDateEntry
//     } = req.body;

//     const date = new Date(invoiceDate);
//     const currentMonth = date.getMonth() + 1;
//     const currentYear = date.getFullYear();

//     // Check if any invoice exists for same customer & month
//     const existingInvoice = await EstInvoice.findOne({
//       custName,
//       custNumb,
//       $expr: {
//         $and: [
//           { $eq: [{ $month: "$date" }, currentMonth] },
//           { $eq: [{ $year: "$date" }, currentYear] }
//         ]
//       }
//     });

//     if (existingInvoice) {
//       const sameDate = new Date(existingInvoice.date).toISOString().split('T')[0] === date.toISOString().split('T')[0];

//       if (sameDate && !allowUpdate) {
//         return res.json({
//           success: false,
//           sameDateExists: true,
//           message: "An invoice with the same date already exists. Do you want to update it?"
//         });
//       }

//       if (!sameDate && !allowNewDateEntry) {
//         return res.json({
//           success: false,
//           differentDateExists: true,
//           message: "An invoice already exists for this month. Do you want to save it as a new entry with a different date?"
//         });
//       }

//       if (sameDate && allowUpdate) {
//         Object.assign(existingInvoice, {
//           custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType, invoiceCateg, customCateg, rows,
//           GSTAmount, totalAmount, billFormat, discountValue, afterDiscountTotal, state
//         });
//         await existingInvoice.save();
//         return res.json({ success: true, message: 'Invoice Updated Successfully' });
//       }
//     }

//     // Save new invoice
//     const estInvoice = new EstInvoice({
//       custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType, custName, custNumb, invoiceCateg,
//       customCateg, rows, date: invoiceDate, GSTAmount, totalAmount, billFormat, financialYear, discountValue, afterDiscountTotal, state
//     });
//     await estInvoice.save();
//     res.json({ success: true, message: 'Invoice Created Successfully' });

//   } catch (err) {
//     console.error("Error saving/updating invoice", err);
//     res.json({ success: false, message: "Error saving invoice" });
//   }
// });

router.post('/estInvoice', async (req, res) => {
  try {
    const {
      custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType, custName, custNumb,
      invoiceCateg, customCateg, rows, invoiceDate, GSTAmount, totalAmount, billFormat, financialYear,
      discountValue, afterDiscountTotal, state, allowUpdate, allowNewDateEntry
    } = req.body;

    const date = new Date(invoiceDate);
    const currentMonth = date.getMonth() + 1;
    const currentYear = date.getFullYear();
    const dateString = date.toISOString().split('T')[0];

    // Find all invoices for the same customer in the same month/year
    const sameMonthInvoices = await EstInvoice.find({
      custName,
      custNumb,
      $expr: {
        $and: [
          { $eq: [{ $month: "$date" }, currentMonth] },
          { $eq: [{ $year: "$date" }, currentYear] }
        ]
      }
    });

    // Check if any of those invoices is for the same exact date
    const sameDateInvoice = sameMonthInvoices.find(inv =>
      new Date(inv.date).toISOString().split('T')[0] === dateString
    );

    // Case 1: Same date exists, and update not allowed
    if (sameDateInvoice && !allowUpdate) {
      return res.json({
        success: false,
        sameDateExists: true,
        message: "An invoice with the same date already exists. Do you want to update it?"
      });
    }

    // Case 2: Same month exists but not same date, and save-new not allowed
    if (!sameDateInvoice && sameMonthInvoices.length > 0 && !allowNewDateEntry) {
      return res.json({
        success: false,
        differentDateExists: true,
        message: "An invoice already exists for this month. Do you want to save this as a new entry with a different date?"
      });
    }

    // Case 3: Same date & update allowed
    if (sameDateInvoice && allowUpdate) {
      Object.assign(sameDateInvoice, {
        custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType,
        invoiceCateg, customCateg, rows, GSTAmount, totalAmount, billFormat,
        discountValue, afterDiscountTotal, state
      });
      await sameDateInvoice.save();
      return res.json({ success: true, message: 'Invoice Updated Successfully' });
    }

    // Case 4: New entry allowed (either first time or allowedNewDateEntry is true)
    const estInvoice = new EstInvoice({
      custGST, custAddLine1, custAddLine2, custAddLine3, billNumber, billType, gstType,
      custName, custNumb, invoiceCateg, customCateg, rows, date, GSTAmount, totalAmount,
      billFormat, financialYear, discountValue, afterDiscountTotal, state
    });

    await estInvoice.save();
    return res.json({ success: true, message: 'Invoice Created Successfully' });

  } catch (err) {
    console.error("Error saving/updating invoice", err);
    res.status(500).json({ success: false, message: "Error saving invoice" });
  }
});



//Update Invoice

// router.post('/updateInvoice', async (req, res) => {
//   try {
//     const {
//       custGST, custAddLine1, custAddLine2, custAddLine3,
//       billNumber, billType, gstType, custName, custNumb,
//       invoiceCateg, customCateg, rows, invoiceDate,
//       GSTAmount, totalAmount, billFormat, allowUpdate
//     } = req.body;

//     Validate invoiceDate
//     if (!invoiceDate || isNaN(new Date(invoiceDate).getTime())) {
//       return res.status(400).json({ success: false, message: "Invalid invoice date" });
//     }

//     const currentMonth = new Date(invoiceDate).getMonth(); // 0-based
//     const currentYear = new Date(invoiceDate).getFullYear();

//     Find existing invoice for same customer & format in same month/year
//     const existingInvoice = await EstInvoice.findOne({
//       custName,
//       custNumb,
//       billFormat,
//       $expr: {
//         $and: [
//           { $eq: [{ $month: "$date" }, currentMonth + 1] }, // MongoDB months are 1-based
//           { $eq: [{ $year: "$date" }, currentYear] }
//         ]
//       }
//     });

//     If invoice exists but allowUpdate is false
//     if (existingInvoice && !allowUpdate) {
//       return res.json({
//         success: false,
//         message: "Invoice of the User already exists in this Month. Do you want to save this as a new entry?",
//         dataExists: true
//       });
//     }

//     If invoice exists and allowUpdate is true
//     if (existingInvoice && allowUpdate) {
//       const updates = {};
//       const fieldsToCompare = {
//         custGST, custAddLine1, custAddLine2, custAddLine3,
//         billNumber, billType, gstType, invoiceCateg,
//         customCateg, GSTAmount, totalAmount, rows
//       };

//       Compare each field — only add to updates if changed
//       for (const [key, newVal] of Object.entries(fieldsToCompare)) {
//         const existingVal = existingInvoice[key];
//         if (JSON.stringify(existingVal) !== JSON.stringify(newVal)) {
//           updates[key] = newVal;
//         }
//       }

//       If there are changes, update only those
//       if (Object.keys(updates).length > 0) {
//         await EstInvoice.updateOne(
//           { _id: existingInvoice._id },
//           { $set: updates }
//         );
//         return res.json({ success: true, message: 'Invoice Updated Successfully (only changed fields)' });
//       } else {
//         return res.json({ success: true, message: 'No changes detected — invoice already up to date' });
//       }
//     }

//     No existing invoice — create new
//     const estInvoice = new EstInvoice({
//       custGST, custAddLine1, custAddLine2, custAddLine3,
//       billNumber, billType, gstType, custName, custNumb,
//       invoiceCateg, customCateg, rows,
//       date: invoiceDate, GSTAmount, totalAmount, billFormat
//     });

//     await estInvoice.save();
//     res.json({ success: true, message: 'Invoice Created Successfully' });

//   } catch (err) {
//     console.error("Error saving/updating invoice:", err);
//     res.status(500).json({ success: false, message: "Error Saving Invoice" });
//   }
// });

router.post('/updateInvoice', async (req, res) => {
  try {
    const {
      custGST, custAddLine1, custAddLine2, custAddLine3,
      billNumber, billType, gstType, custName, custNumb,
      invoiceCateg, customCateg, rows, invoiceDate,
      GSTAmount, totalAmount, billFormat, allowUpdate, financialYear, discountValue, afterDiscountTotal, state
    } = req.body;

    if (!invoiceDate || isNaN(new Date(invoiceDate).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid invoice date" });
    }

    const currentMonth = new Date(invoiceDate).getMonth();
    const currentYear = new Date(invoiceDate).getFullYear();

    const existingInvoice = await EstInvoice.findOne({
      custName,
      custNumb,
      //billFormat,
      $expr: {
        $and: [
          { $eq: [{ $month: "$date" }, currentMonth + 1] },
          { $eq: [{ $year: "$date" }, currentYear] }
        ]
      }
    });

    if (existingInvoice && !allowUpdate) {
      return res.json({
        success: false,
        message: "Invoice of the User already exists in this Month. Do you want to save this as a new entry?",
        dataExists: true
      });
    }

    if (existingInvoice && allowUpdate) {
      const updates = {};
      const scalarFields = {
        custGST, custAddLine1, custAddLine2, custAddLine3,
        billNumber, billType, gstType,
        invoiceCateg, customCateg, GSTAmount, totalAmount, discountValue, afterDiscountTotal, state
      };

      for (const [key, newVal] of Object.entries(scalarFields)) {
        const oldVal = existingInvoice[key];
        if (oldVal !== newVal) {
          updates[key] = newVal;
        }
      }

      // Compare rows (deep comparison)
      if (JSON.stringify(existingInvoice.rows) !== JSON.stringify(rows)) {
        updates.rows = rows;
      }

      if (Object.keys(updates).length > 0) {
        await EstInvoice.updateOne(
          { _id: existingInvoice._id },
          { $set: updates }
        );
        return res.json({ success: true, message: 'Invoice Updated Successfully (only changed fields)' });
      } else {
        return res.json({ success: true, message: 'No changes detected — invoice already up to date' });
      }
    }

    // Create new invoice
    const estInvoice = new EstInvoice({
      custGST, custAddLine1, custAddLine2, custAddLine3,
      billNumber, billType, gstType, custName, custNumb,
      invoiceCateg, customCateg, rows,
      date: invoiceDate, GSTAmount, totalAmount, billFormat, financialYear, discountValue, afterDiscountTotal, state
    });

    await estInvoice.save();
    res.json({ success: true, message: 'Invoice Created Successfully' });

  } catch (err) {
    console.error("Error saving/updating invoice:", err);
    res.status(500).json({ success: false, message: "Error Saving Invoice" });
  }
});

// Estimate Invoice Count

router.get('/estInvoiceCount', async (req, res) => {
  const dataLength = await EstInvoice.countDocuments({ billFormat: 'Estimate' });
  //const dataLength = await EstInvoice.countDocuments();
  return res.json(dataLength);
});

// Main Invoice Count

// router.get('/mainInvoiceCount', async (req, res) => {
//   const dataLength = await EstInvoice.countDocuments({ billFormat: 'Main' });
//   const nonGST = await EstInvoice.countDocuments({ billFormat: 'Non-GST'});
//   return res.json({dataLength, nonGST});
// });

router.get('/mainInvoiceCount', async (req, res) => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const currentFY =
      month >= 4
        ? `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`
        : `${String(year - 1).slice(-2)}-${String(year).slice(-2)}`;

    const { clientFY } = req.query;

    const isCurrentFY = clientFY === currentFY;

    // For current FY: count those with no financialYear OR with financialYear == clientFY
    let mainFilter = { billFormat: 'Main' };
    let nonGstFilter = { billFormat: 'Non-GST' };

    if (!isCurrentFY) {
      // For next year, only count where financialYear is set
      mainFilter = { ...mainFilter, financialYear: clientFY };
      nonGstFilter = { ...nonGstFilter, financialYear: clientFY };
    } else {
      // For current FY, include documents with missing financialYear or matching currentFY
      mainFilter = {
        ...mainFilter,
        $or: [{ financialYear: { $exists: false } }, { financialYear: clientFY }]
      };
      nonGstFilter = {
        ...nonGstFilter,
        $or: [{ financialYear: { $exists: false } }, { financialYear: clientFY }]
      };
    }

    const dataLength = await EstInvoice.countDocuments(mainFilter);
    const nonGST = await EstInvoice.countDocuments(nonGstFilter);

    const gstStart = isCurrentFY ? 111 : 1;
    const nonGstStart = isCurrentFY ? 181 : 1;

    return res.json({
      dataLength,
      nonGST,
      invoiceStart: gstStart + dataLength,
      nonGSTStart: nonGstStart + nonGST
    });

  } catch (err) {
    console.error('Error in /mainInvoiceCount:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// sales Whatsapp Work Admin

router.get('/getSalesWhatsAppWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const todayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfToday,
        $lt: endOfToday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(todayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesYesterdayWhatsAppWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesOneYesterdayWhatsAppWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesTwoYesterdayWhatsAppWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesThreeYesterdayWhatsAppWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 4);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });

    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesFourYesterdayWhatsAppWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 5);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getSalesFiveYesterdayWhatsAppWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 6);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      campaign_Name: { $regex: new RegExp(name, 'i') }
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Firebase Push Notifications

var acesToken = '';
router.get('/getAccessToken', async (req, res) => {
  return new Promise(function (resolve, reject) {
    const key = require('./admix-demo-firebase-adminsdk-952at-abf2518dc7.json');
    const jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES,
      null
    );
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        reject(err);
        return;
      }
      acesToken = tokens.access_token;
      resolve(tokens.access_token);
    });
  });
});

router.put('/save-Token/:token1', checkAuth, async (req, res) => {
  try {
    const userId = req.userData.userId;
    const token1 = req.params.token1;
    const updatedUser = await User.findByIdAndUpdate(userId);

    if (updatedUser.accessToken) {
      console.log("TOKEN ALREADY STORED");
      return res.status(400).json({ success: false, message: "Token already exists for this user" });
    }

    if (updatedUser) {
      updatedUser.accessToken = token1;
      await updatedUser.save();
      res.json({ success: true, data: updatedUser });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    console.error("Error saving token:", error.message);
    res.status(500).json({ success: false, message: "Failed to save token" });
  }
});

// SalesPerson to Admin
router.post('/bell', async (req, res) => {
  try {
    const data = req.body.items;
    const msgTitle = req.body.msgTitle;
    const msgBody = req.body.msgBody;
    const currentDate = req.body.currentDate;
    let token = '';
    let nameA = '';
    for (const item of data) {
      let existingItem = await User.findById(item._id);
      if (existingItem) {
        token = existingItem.accessToken;
        nameA = existingItem.signupRole;
        break;
      }
    }
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid FCM token provided');
    }
    await sendNotif(token, msgTitle, msgBody);
    const notifi = new Notification({
      msgTitle: msgTitle,
      msgBody: msgBody,
      Date: currentDate,
      Admin: nameA,
      Status: 'Unread'
    })
    await notifi.save();
    res.json({ status: "success" })
  } catch (error) {
    console.error("Notification API Error: ", error.message);
    res.status(500).json({ status: "fail", error: error.message });
  }
});

// Admin to Editor and SalesPerson
router.post('/bells', async (req, res) => {
  try {
    const data = req.body.items;
    const sales = req.body.sales;
    const msgTitle = req.body.msgTitle;
    const msgBody = req.body.msgBody;
    const currentDate = req.body.currentDate;
    let token1 = '';
    let token2 = '';
    let nameS = '';
    let nameE = '';
    let nameV = '';
    let nameG = '';
    let nameA = '';
    let saleItem = '';
    for (const saleAc of sales) {
      const saleItems = await Customer.findById(saleAc._id);
      if (saleItems) {
        saleItem = saleItems.salesPerson;
      }
    }
    const saleperson = await User.findOne({ signupUsername: saleItem });
    if (saleperson) {
      token2 = saleperson.accessToken;
    }
    for (const item of data) {
      let existingItem = await User.findById(item._id);
      if (existingItem) {
        token1 = existingItem.accessToken;
        if (existingItem.signupRole === 'Script Writer') {
          nameS = existingItem.signupUsername;
        } else if (existingItem.signupRole === 'Editor') {
          nameE = existingItem.signupUsername;
        } else if (existingItem.signupRole === 'VO Artist') {
          nameV = existingItem.signupUsername;
        } else if (existingItem.signupRole === 'Graphic Designer') {
          nameG = existingItem.signupUsername;
        } else if (existingItem.signupRole === 'Admin') {
          nameA = existingItem.signupUsername;
        } else {
          console.log("SignupRole Error");
        }
        break;
      }
    }
    if (!token1 || typeof token1 !== 'string') {
      throw new Error('Invalid FCM token provided');
    }
    if (!token2 || typeof token2 !== 'string') {
      throw new Error('Invalid FCM token provided');
    }
    await sendNotif(token2, msgTitle, msgBody);
    if (token2) {
      await sendNotif(token1, msgTitle, msgBody);
    } else {
      console.log("No valid token for salesperson to send notification");
    }
    const notifi = new Notification({
      msgTitle: msgTitle,
      msgBody: msgBody,
      Date: currentDate,
      ScriptWriter: nameS,
      Editor: nameE,
      VoiceOver: nameV,
      GraphicDesigner: nameG,
      Admin: nameA,
      Status: 'Unread'
    })
    await notifi.save();
    const notifiSales = new Notification({
      msgTitle: msgTitle,
      msgBody: msgBody,
      Date: currentDate,
      SalesPerson: saleItem,
      Status: 'Unread'
    })
    await notifiSales.save();
    res.json({ status: "success" })
  } catch (error) {
    console.error("Notification API Error: ", error.message);
    res.status(500).json({ status: "fail", error: error.message });
  }
});

// Editor to Admin and SalesPErson
router.post('/bellsAdmin', async (req, res) => {
  try {
    const data = req.body.items;
    const sales = req.body.sales;
    const msgTitle = req.body.msgTitle;
    const msgBody = req.body.msgBody;
    const currentDate = req.body.currentDate;
    let token1 = '';
    let token2 = '';
    let nameA = '';
    const saleperson = await User.findOne({ signupUsername: sales });
    if (saleperson) {
      token2 = saleperson.accessToken;
    } else {
      console.log("SalesPerson Error");
    }
    for (const item of data) {
      let existingItem = await User.findById(item._id);
      if (existingItem) {
        token1 = existingItem.accessToken;
        nameA = existingItem.signupRole;
      } else {
        console.log("ExistingItem Error");
      }
    }
    if (!token1 || typeof token1 !== 'string') {
      throw new error("Invalid FCM token provided");
    }
    if (!token2 || typeof token2 !== 'string') {
      throw new error("Invalid FCM token provided");
    }
    await sendNotif(token1, msgTitle, msgBody);
    await sendNotif(token2, msgTitle, msgBody);
    const notifi = new Notification({
      msgTitle: msgTitle,
      msgBody: msgBody,
      Date: currentDate,
      Admin: nameA,
      Status: 'Unread'
    });
    await notifi.save();
    const notifiSales = new Notification({
      msgTitle: msgTitle,
      msgBody: msgBody,
      Date: currentDate,
      SalesPerson: sales,
      Status: 'Unread'
    });
    await notifiSales.save();
    res.json({ status: "success" });
  } catch (error) {
    console.error("Notification API Error: ", error.message);
    res.status(500).json({ status: "fail", error: error.message });
  }
});

router.get('/getNotification', checkAuth, async (req, res) => {
  const person1 = req.userData.name;
  const role = req.userData.signupRole;
  try {
    let query1 = {
      Status: { $regex: /^Unread$/i },
      $or: [
        { ScriptWriter: person1 },
        { Editor: person1 },
        { VoiceOver: person1 },
        { GraphicDesigner: person1 },
        { SalesPerson: person1 },
        { Admin: person1 }
      ]
    };
    const unReadNotif = await Notification.find(query1);
    let query2 = {
      Status: { $regex: /^Read$/i },
      $or: [
        { ScriptWriter: person1 },
        { Editor: person1 },
        { VoiceOver: person1 },
        { GraphicDesigner: person1 },
        { SalesPerson: person1 },
        { Admin: person1 }
      ]
    };
    const readNotif = await Notification.find(query2);
    let query3 = {
      Status: { $regex: /^Unread$/i },
      Admin: role
    };
    const unReadAdmin = await Notification.find(query3);
    let query4 = {
      Status: { $regex: /^Read$/i },
      Admin: role
    };
    const readAdmin = await Notification.find(query4);
    res.json({ unReadNotif, readNotif, unReadAdmin, readAdmin });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" })
  }
});

router.post('/markRead', async (req, res) => {
  try {
    const { id } = req.body;
    await Notification.findByIdAndUpdate(id, { Status: 'Read' });
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error updating notification status", error.message);
    res.status(500).json({ status: "fail", error: error.message });
  }
});

// Top Performer

router.get('/topPerformer', async (req, res) => {
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();
  try {
    const results = await Customer.aggregate([
      {
        $match: {
          closingDate: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $group: {
          _id: '$salesPerson',
          totalClosingPrice: { $sum: '$closingPrice' }
        }
      },
      {
        $sort: { totalClosingPrice: -1 }
      }
    ]);
    if (results.length > 0) {
      results.forEach(result => {
        console.log(`SalesPerson: ${result._id}, Total Closing Price: ${result.totalClosingPrice}`);
      });
      res.json(results);
    } else {
      console.log('No sales Entries found')
    }
  } catch (error) {
    console.error("Error getting top performer", error.message);
    res.status(500).json({ status: "fail", error: error.message });
  }
});

//monthly top performer

router.get('/monthlyPerformer', async (req, res) => {
  const startOfYear = moment().startOf('year').toDate();
  const endOfYear = moment().endOf('year').toDate();
  try {
    const results = await Customer.aggregate([
      {
        $match: {
          closingDate: {
            $gte: startOfYear,
            $lt: endOfYear
          }
        }
      },
      {
        $group: {
          _id: {
            salesPerson: '$salesPerson',
            month: { $month: '$closingDate' },
            year: { $year: '$closingDate' }
          },
          numberOfClosings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.salesPerson': 1, '_id.month': 1 }
      }
    ]);
    const transformedResults = results.reduce((acc, item) => {
      const { salesPerson, month } = item._id;
      if (!acc[salesPerson]) acc[salesPerson] = {};
      acc[salesPerson][month] = item.numberOfClosings;
      return acc;
    }, {});
    res.json(transformedResults);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving salespersons monthly performance.' });
  }
});

// Top Selling Product

router.get('/topProduct', async (req, res) => {
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();
  try {
    const results = await Customer.aggregate([
      {
        $match: {
          closingDate: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $group: {
          _id: '$closingCateg',
          numberOfClosings: { $sum: 1 }
        }
      },
      {
        $sort: { numberOfClosings: -1 }
      }
    ]);
    if (results.length > 0) {
      console.log('Top performer of the Month: ', results[0]);
      results.forEach(result => {
        console.log(`ClosingCateg: ${result._id}, Number of Closings: ${result.numberOfClosings}`);
      });
      res.json(results);
    } else {
      console.log('No sales Entries found')
    }
  } catch (error) {
    console.error("Error getting top performer", error.message);
    res.status(500).json({ status: "fail", error: error.message });
  }
});

router.get('/conversionRate', async (req, res) => {
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();
  try {
    const totalLeads = await salesLead.aggregate([
      {
        $match: {
          closingDate: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $group: {
          _id: '$salesPerson',
          totalNumberOfLeads: { $sum: 1 }
        }
      }
    ]);
    const totalSales = await Customer.aggregate([
      {
        $match: {
          closingDate: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $group: {
          _id: '$salesPerson',
          totalNumberOfSales: { $sum: 1 }
        }
      }
    ]);
    const conversionRates = totalLeads.map(lead => {
      const sales = totalSales.find(sale => sale._id.toString() === lead._id.toString());
      const totalNumberOfLeads = lead.totalNumberOfLeads;
      const totalNumberOfSales = sales ? sales.totalNumberOfSales : 0;
      const totalSum = totalNumberOfLeads + totalNumberOfSales;
      const conversionRate = totalNumberOfLeads ? (totalNumberOfSales / totalSum) * 100 : 0;
      return {
        salesPerson: lead._id,
        totalLeads: totalNumberOfLeads,
        totalSales: totalNumberOfSales,
        totalSum: totalSum,
        conversionRate: conversionRate.toFixed(2) // converting to a fixed-point notation
      };
    });
    if (conversionRates.length > 0) {
      res.json({ status: 'success', data: conversionRates });
    } else {
      res.json({ status: 'success', data: [], message: 'No leads or sales found for the current month' });
    }
  } catch (error) {
    res.status(500).json({ status: 'fail', error: error.message });
  }
});

// router.get('/conversionRateMonthly', async (req, res) => {
//   try {
//     const totalLeads = await salesLead.aggregate([
//       {
//         $group: {
//           _id: {
//             salesPerson: '$salesPerson',
//             month: { $month: '$closingDate' },
//             year: { $year: '$closingDate' }
//           },
//           totalNumberOfLeads: { $sum: 1 }
//         }
//       }
//     ]);
//     const totalSales = await Customer.aggregate([
//       {
//         $group: {
//           _id: {
//             salesPerson: '$salesPerson',
//             month: { $month: '$closingDate' },
//             year: { $year: '$closingDate' }
//           },
//           totalNumberOfSales: { $sum: 1 }
//         }
//       }
//     ]);
//     const conversionRates = totalLeads.map(lead => {
//       const sales = totalSales.find(sale =>
//         sale._id.salesPerson &&
//         sale._id.salesPerson === lead._id.salesPerson &&
//         sale._id.month === lead._id.month &&
//         sale._id.year === lead._id.year
//       );
//       const totalNumberOfLeads = lead.totalNumberOfLeads;
//       const totalNumberOfSales = sales ? sales.totalNumberOfSales : 0;
//       const totalSum = totalNumberOfLeads + totalNumberOfSales;
//       const conversionRate = totalNumberOfLeads ? (totalNumberOfSales / totalSum) * 100 : 0;
//       return {
//         salesPerson: lead._id.salesPerson,
//         month: lead._id.month,
//         year: lead._id.year,
//         totalLeads: totalNumberOfLeads,
//         totalSales: totalNumberOfSales,
//         conversionRate: conversionRate.toFixed(2) // converting to a fixed-point notation
//       };
//     });
//     if (conversionRates.length > 0) {
//       res.json({ status: 'success', data: conversionRates });
//     } else {
//       res.json({ status: 'success', data: [], message: 'No leads or sales found' });
//     }
//   } catch (error) {
//     res.status(500).json({ status: 'fail', error: error.message });
//   }
// });

router.get('/conversionRateMonthly', async (req, res) => {
  try {
    const totalLeads = await salesLead.aggregate([
      {
        $group: {
          _id: {
            salesPerson: '$salesPerson',
            month: { $month: '$closingDate' },
            year: { $year: '$closingDate' }
          },
          totalNumberOfLeads: { $sum: 1 }
        }
      }
    ]);

    const totalSales = await Customer.aggregate([
      {
        $group: {
          _id: {
            salesPerson: '$salesPerson',
            month: { $month: '$closingDate' },
            year: { $year: '$closingDate' }
          },
          totalNumberOfSales: { $sum: 1 }
        }
      }
    ]);

    // Calculate conversion rates
    const conversionRates = totalLeads.map(lead => {
      const sales = totalSales.find(sale =>
        sale._id.salesPerson === lead._id.salesPerson &&
        sale._id.month === lead._id.month &&
        sale._id.year === lead._id.year
      );
      const totalNumberOfLeads = lead.totalNumberOfLeads;
      const totalNumberOfSales = sales ? sales.totalNumberOfSales : 0;
      const conversionRate = totalNumberOfLeads
        ? ((totalNumberOfSales / totalNumberOfLeads) * 100).toFixed(2)
        : 0;

      return {
        salesPerson: lead._id.salesPerson,
        month: lead._id.month,
        year: lead._id.year,
        conversionRate
      };
    });

    res.json({ status: 'success', data: conversionRates });
  } catch (error) {
    res.status(500).json({ status: 'fail', error: error.message });
  }
});

//Attendance & totalLoggedInTime

router.get('/attendance1', (req, res) => {
  const { year, month } = req.query; // Expecting year and month in the query params
  // Validate the year and month
  if (!year || !month) {
    return res.status(400).json({ success: false, message: "Year and month are required." });
  }
  // Calculate the start and end dates for the month
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  // Query to find all users with login times within the specified month
  User.find({
    "loginSessions.loginTime": {
      $gte: startDate,
      $lte: endDate
    }
  })
    .exec()
    .then(users => {
      // Prepare attendance data for each user
      const attendanceData = users.map(user => {
        // Create an array to store the attendance status and total logged-in time for each day of the month
        const daysInMonth = new Date(year, month, 0).getDate();
        const attendance = Array.from({ length: daysInMonth }, (_, day) => {
          const currentDate = new Date(year, month - 1, day + 2);
          const formattedDate = currentDate.toISOString().slice(0, 10);
          // Filter the login sessions that occurred on this day
          const sessionsForDay = user.loginSessions.filter(session =>
            session.loginTime.toISOString().slice(0, 10) === formattedDate
          );
          let totalLoggedInTime = 0;
          // Calculate total logged-in time for the day
          sessionsForDay.forEach(session => {
            if (session.logoutTime) {
              const loginTime = new Date(session.loginTime);
              const logoutTime = new Date(session.logoutTime);
              totalLoggedInTime += (logoutTime - loginTime); // Time in milliseconds
            }
          });
          // Convert totalLoggedInTime from milliseconds to hours, minutes, and seconds
          const totalHours = Math.floor(totalLoggedInTime / (1000 * 60 * 60));
          const totalMinutes = Math.floor((totalLoggedInTime % (1000 * 60 * 60)) / (1000 * 60));
          const totalSeconds = Math.floor((totalLoggedInTime % (1000 * 60)) / 1000);
          return {
            date: formattedDate,
            status: sessionsForDay.length > 0 ? 'Present' : 'Absent',
            totalLoggedInTime: sessionsForDay.length > 0
              ? `${totalHours} h, ${totalMinutes} min, ${totalSeconds} sec`
              : 'N/A'
          };
        });
        return {
          username: user.signupUsername,
          attendance: attendance
        };
      });
      res.json({ success: true, data: attendanceData });
    })
    .catch(err => {
      console.error("Error fetching attendance data:", err);
      res.status(500).json({ success: false, message: "Error fetching attendance data." });
    });
});

// Save updated attendance
router.post('/update-attendance', async (req, res) => {
  const { username, year, month, attendance } = req.body;
  if (!username || !year || !month || !attendance) {
    return res.status(400).json({ success: false, message: "Username, year, month, and attendance data are required." });
  }
  try {
    // Update the user's attendance in the database
    await User.updateOne(
      { signupUsername: username },
      { $set: { [`attendance.${year}.${month}`]: attendance } }
    );
    res.json({ success: true, message: "Attendance updated successfully." });
  } catch (err) {
    console.error("Error updating attendance:", err);
    res.status(500).json({ success: false, message: "Error updating attendance." });
  }
});

router.get('/attendance', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ success: false, message: "Year and month are required." });
  }
  try {
    const users = await User.find({}).exec();
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendancePromises = users.map(async user => {
      let currentAttendance;
      // If attendance is stored as a Map, use get() method to access it
      if (user.attendance instanceof Map) {
        const yearAttendance = user.attendance.get(year);  // Get the attendance for the year
        if (yearAttendance instanceof Map) {
          currentAttendance = yearAttendance.get(month);  // Get the attendance for the month
        }
      } else {
        currentAttendance = user.attendance?.[year]?.[month];  // Fallback to object access
      }
      if (!currentAttendance) {
        // Generate default attendance data if it doesn't exist
        const defaultAttendance = Array.from({ length: daysInMonth }, (_, day) => {
          // const currentDate = new Date(year, month - 1, day + 2);  // Adjusted day calculation
          const currentDate = new Date(year, month - 1, day + 1);
          //const currentDate = new Date(year, month - 1, day);
          return {
            // date: currentDate.toISOString().slice(0, 10),
            date: currentDate.toISOString().split("T")[0],
            status: 'Select', // Default status
            reason: ''
          };
        });
        // Update user's attendance with default data
        await User.updateOne(
          { _id: user._id },
          { $set: { [`attendance.${year}.${month}`]: defaultAttendance } }
        );
        return {
          username: user.signupUsername,
          attendance: defaultAttendance,
          totalPresent: 0,
          totalAbsent: 0,
          totalHalfDay: 0
        };
      }
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalHalfDay = 0;
      currentAttendance.forEach(day => {
        if (day.status === 'Present') {
          totalPresent++;
        } else if (day.status === 'Absent') {
          totalAbsent++;
        } else if (day.status === 'HalfDay') {
          totalHalfDay++;
        }
      });
      // Return existing attendance if it exists
      return {
        username: user.signupUsername,
        attendance: currentAttendance,
        totalPresent,
        totalAbsent,
        totalHalfDay
      };
    });
    const attendanceData = await Promise.all(attendancePromises);
    res.json({ success: true, data: attendanceData });
  } catch (err) {
    console.error("Error fetching or updating attendance data:", err);
    res.status(500).json({ success: false, message: "Error fetching or updating attendance data." });
  }
});

// salesPerson wise Attendance

router.get('/usersAttendance', async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) {
    return res.status(400).json({ success: false, message: "Year and month are required." });
  }
  try {
    const salesPerson = person;
    console.log("ATTENDANCE SALES===========>>", salesPerson);
    const users = await User.find({ signupUsername: salesPerson });
    console.log("Attendance Person===>>", users);
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendancePromises = users.map(async user => {
      let currentAttendance;
      // If attendance is stored as a Map, use get() method to access it
      if (user.attendance instanceof Map) {
        const yearAttendance = user.attendance.get(year);  // Get the attendance for the year
        if (yearAttendance instanceof Map) {
          currentAttendance = yearAttendance.get(month);  // Get the attendance for the month
        }
      } else {
        currentAttendance = user.attendance?.[year]?.[month];  // Fallback to object access
      }
      if (!currentAttendance) {
        // Generate default attendance data if it doesn't exist
        const defaultAttendance = Array.from({ length: daysInMonth }, (_, day) => {
          // const currentDate = new Date(year, month - 1, day + 2);  // Adjusted day calculation
          const currentDate = new Date(year, month - 1, day + 1);
          //const currentDate = new Date(year, month -1, day);
          return {
            date: currentDate.toISOString().split("T")[0],
            status: 'Select'  // Default status
          };
        });
        // Update user's attendance with default data
        await User.updateOne(
          { _id: user._id },
          { $set: { [`attendance.${year}.${month}`]: defaultAttendance } }
        );
        return {
          username: user.signupUsername,
          attendance: defaultAttendance,
          totalPresent: 0,
          totalAbsent: 0,
          totalHalfDay: 0
        };
      }
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalHalfDay = 0;
      currentAttendance.forEach(day => {
        if (day.status === 'Present') {
          totalPresent++;
        } else if (day.status === 'Absent') {
          totalAbsent++;
        } else if (day.status === 'HalfDay') {
          totalHalfDay++;
        }
      });
      // Return existing attendance if it exists
      return {
        username: user.signupUsername,
        attendance: currentAttendance,
        totalPresent,
        totalAbsent,
        totalHalfDay
      };
    });
    const attendanceData = await Promise.all(attendancePromises);
    res.json({ success: true, data: attendanceData });
  } catch (err) {
    console.error("Error fetching or updating attendance data:", err);
    res.status(500).json({ success: false, message: "Error fetching or updating attendance data." });
  }
});

// new Subsidiary

router.post('/newSubsidiary', async (req, res) => {
  try {
    const subsidiary = new Subsidiary({
      subsidiaryName: req.body.subsidiaryName
    })
    await subsidiary.save().then((_) => {
      res.json({ success: true, message: "New Subsidiary Added" })
    }).catch((err) => {
      if (err.code === 11000) {
        return res.json({ success: false, message: "Subsidiary Already Added" })
      }
    });
  } catch (error) {
    console.error('Error Adding Subsidiary', error);
    res.status(500).json({ error: 'Failed to add Subsidiary' });
  }
});

// Get Subsidiary

router.get('/getSubsidiary', async (req, res) => {
  try {
    const subsidiaries = await Subsidiary.find();
    res.json(subsidiaries);
  } catch (error) {
    console.error("Error Fetching Subsidiaries", error);
    res.status(500).json({ error: 'Failed to Fetch Subsidiary Data' });
  }
});

// Urgent Script Projects

router.get('/urgentScriptProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const urgentProjects = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      priority: 'Urgent',
      scriptStatus: { $ne: 'Complete' }
    }).sort({ scriptPassDate: -1 });
    return res.json(urgentProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});

router.get('/highScriptProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const urgentProjects = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      priority: 'High',
      scriptStatus: { $ne: 'Complete' }
    }).sort({ scriptPassDate: -1 });
    return res.json(urgentProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});

router.get('/mediumScriptProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const urgentProjects = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      priority: 'Medium',
      scriptStatus: { $ne: 'Complete' }
    }).sort({ scriptPassDate: -1 });
    return res.json(urgentProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});

// Urgent Editor Projects

// router.get('/urgentEditorProjects', async (req, res) => {
//   try {
//     const currentMonth = new Date().getMonth() + 1;
//     const urgentProjects = await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth, 0)
//       },
//       priority: 'Urgent',
//       editorStatus: { $ne: 'Completed' }
//     }).sort({ editorPassDate: -1 });
//     return res.json(urgentProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

// router.get('/urgentEditorProjects', async (req, res) => {
//   try {
//     const now = new Date();
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

//     const isValidDate = (d) => d && new Date(d) >= startOfMonth && new Date(d) <= endOfMonth;

//     const urgentDocs = await Customer.find({
//       priority: 'Urgent',
//       editorStatus: { $ne: 'Completed' }
//     }).sort({ editorPassDate: -1 });

//     const urgentProjects = [];

//     urgentDocs.forEach(doc => {
//       const item = doc.toObject();

//       const mainValid = item.editor === person && isValidDate(item.editorPassDate);

//       const validSubEntries = (item.subEntries || []).filter(sub =>
//         sub.editor === person && isValidDate(sub.editorPassDate)
//       );

//       if (mainValid) {
//         urgentProjects.push({
//           ...item,
//           subEntries: validSubEntries,
//           type: 'Customer'
//         });
//       } else if (validSubEntries.length > 0) {
//         validSubEntries.forEach(sub => {
//           urgentProjects.push({
//             ...sub,
//             parentCustCode: item.custCode,
//             type: 'Customer'
//           });
//         });
//       }
//     });

//     return res.json(urgentProjects);
//   } catch (error) {
//     console.error("Error Fetching Urgent Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' });
//   }
// });

router.get('/urgentEditorProjects', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const isValidDate = (date) => {
      return date && new Date(date) >= startOfMonth && new Date(date) <= endOfMonth;
    };

    const urgentCustomers = await Customer.find({
      priority: 'Urgent',
      $or: [
        { editorStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ editorPassDate: -1 });

    const urgentB2bCustomers = await B2bCustomer.find({
      priority: 'Urgent',
      $or: [
        { editorStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ b2bEditorPassDate: -1 });

    const urgentProjects = [];

    urgentCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid =
        item.editor === person &&
        item.editorStatus !== 'Completed' &&
        isValidDate(item.editorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        urgentProjects.push({
          ...item,
          subEntries: validSubEntries,
          type: 'Customer'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          urgentProjects.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'Customer'
          });
        });
      }
    });

    urgentB2bCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid =
        item.b2bEditor === person &&
        item.editorStatus !== 'Completed' &&
        isValidDate(item.b2bEditorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        urgentProjects.push({
          ...item,
          subEntries: validSubEntries,
          type: 'b2b'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          urgentProjects.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'b2b'
          });
        });
      }
    });

    return res.json(urgentProjects);
  } catch (error) {
    console.error("Error Fetching Urgent Projects", error);
    res.status(500).json({ error: 'Failed to fetch urgent projects' });
  }
});


// router.get('/highEditorProjects', async (req, res) => {
//   try {
//     const currentMonth = new Date().getMonth() + 1;
//     const urgentProjects = await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth, 0)
//       },
//       priority: 'High',
//       editorStatus: { $ne: 'Completed' }
//     }).sort({ editorPassDate: -1 });
//     return res.json(urgentProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

router.get('/highEditorProjects', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const isValidDate = (date) =>
      date && new Date(date) >= startOfMonth && new Date(date) <= endOfMonth;

    // Define 'person' (should come from auth or query)
    // const person = req.user?.username || req.query.person;
    // if (!person) {
    //   return res.status(400).json({ error: 'Missing editor identity' });
    // }

    const highCustomers = await Customer.find({
      priority: 'High',
      $or: [
        { editorStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ editorPassDate: -1 });

    const highB2bCustomers = await B2bCustomer.find({
      priority: 'High',
      $or: [
        { editorStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ b2bEditorPassDate: -1 });

    const highProjects = [];

    // Process Customer documents
    highCustomers.forEach(doc => {
      const item = doc.toObject();

      const mainValid =
        item.editor === person &&
        item.editorStatus !== 'Completed' &&
        isValidDate(item.editorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        highProjects.push({
          ...item,
          subEntries: validSubEntries,
          type: 'Customer'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          highProjects.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'Customer'
          });
        });
      }
    });

    // Process B2B documents
    highB2bCustomers.forEach(doc => {
      const item = doc.toObject();

      const mainValid =
        item.b2bEditor === person &&
        item.editorStatus !== 'Completed' &&
        isValidDate(item.b2bEditorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        highProjects.push({
          ...item,
          subEntries: validSubEntries,
          type: 'b2b'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          highProjects.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'b2b'
          });
        });
      }
    });

    return res.json(highProjects);
  } catch (error) {
    console.error("Error Fetching High Priority Projects:", error);
    res.status(500).json({ error: 'Failed to fetch high priority projects' });
  }
});


// router.get('/mediumEditorProjects', async (req, res) => {
//   try {
//     const currentMonth = new Date().getMonth() + 1;
//     const urgentProjects = await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth, 0)
//       },
//       priority: 'Medium',
//       editorStatus: { $ne: 'Completed' }
//     }).sort({ editorPassDate: -1 });
//     return res.json(urgentProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

router.get('/mediumEditorProjects', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const isValidDate = (date) =>
      date && new Date(date) >= startOfMonth && new Date(date) <= endOfMonth;

    // Define 'person' (should be passed via auth or query param)
    // const person = req.user?.username || req.query.person;
    // if (!person) {
    //   return res.status(400).json({ error: 'Missing editor identity' });
    // }

    const mediumCustomers = await Customer.find({
      priority: 'Medium',
      $or: [
        { editorStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ editorPassDate: -1 });

    const mediumB2bCustomers = await B2bCustomer.find({
      priority: 'Medium',
      $or: [
        { editorStatus: { $ne: 'Completed' } },
        { subEntries: { $elemMatch: { editorStatus: { $ne: 'Completed' } } } }
      ]
    }).sort({ b2bEditorPassDate: -1 });

    const mediumProjects = [];

    // Process Customer documents
    mediumCustomers.forEach(doc => {
      const item = doc.toObject();

      const mainValid =
        item.editor === person &&
        item.editorStatus !== 'Completed' &&
        isValidDate(item.editorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        mediumProjects.push({
          ...item,
          subEntries: validSubEntries,
          type: 'Customer'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          mediumProjects.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'Customer'
          });
        });
      }
    });

    // Process B2B documents
    mediumB2bCustomers.forEach(doc => {
      const item = doc.toObject();

      const mainValid =
        item.b2bEditor === person &&
        item.editorStatus !== 'Completed' &&
        isValidDate(item.b2bEditorPassDate);

      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.editorStatus !== 'Completed' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        mediumProjects.push({
          ...item,
          subEntries: validSubEntries,
          type: 'b2b'
        });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          mediumProjects.push({
            ...sub,
            parentCustCode: item.custCode,
            type: 'b2b'
          });
        });
      }
    });

    return res.json(mediumProjects);
  } catch (error) {
    console.error("Error Fetching Medium Priority Projects:", error);
    res.status(500).json({ error: 'Failed to fetch medium priority projects' });
  }
});

// router.get('/changesEditorProjects', async (req, res) => {
//   const currentMonth = new Date().getMonth() + 1;
//   try {
//     const changesProjects = await Customer.find({
//       editor: person,
//       editorPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth)
//       },
//       projectStatus: { $eq: 'Video Changes' }
//     }).sort({ editorPassDate: -1 });
//     return res.json(changesProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

router.get('/changesEditorProjects', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const isValidDate = (date) => date && new Date(date) >= startOfMonth && new Date(date) <= endOfMonth;

    const changesCustomers = await Customer.find({
      projectStatus: 'Video Changes'
    }).sort({ editorPassDate: -1 });

    const changesB2bCustomers = await B2bCustomer.find({
      projectStatus: 'Video Changes'
    }).sort({ b2bEditorPassDate: -1 });

    const changesProjects = [];

    changesCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.editor === person && isValidDate(item.editorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.projectStatus === 'Video Changes' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        changesProjects.push({ ...item, subEntries: validSubEntries, type: 'Customer' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          changesProjects.push({ ...sub, parentCustCode: item.custCode, type: 'Customer' });
        });
      }
    });

    changesB2bCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.b2bEditor === person && isValidDate(item.b2bEditorPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.editor === person &&
        sub.projectStatus === 'Video Changes' &&
        isValidDate(sub.editorPassDate)
      );

      if (mainValid) {
        changesProjects.push({ ...item, subEntries: validSubEntries, type: 'b2b' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          changesProjects.push({ ...sub, parentCustCode: item.custCode, type: 'b2b' });
        });
      }
    });

    return res.json(changesProjects);
  } catch (error) {
    console.error("Error Fetching Changes Projects", error);
    res.status(500).json({ error: 'Failed to fetch changes projects' });
  }
});

// Urgent Vo Projects

router.get('/urgentVoProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const urgentProjects = await Customer.find({
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      priority: 'Urgent',
      voiceOverStatus: { $ne: 'Complete' }
    }).sort({ voicePassDate: -1 });
    return res.json(urgentProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});

router.get('/highVoProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const urgentProjects = await Customer.find({
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      priority: 'High',
      voiceOverStatus: { $ne: 'Complete' }
    }).sort({ voicePassDate: -1 });
    return res.json(urgentProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});

router.get('/mediumVoProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const urgentProjects = await Customer.find({
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      priority: 'Medium',
      voiceOverStatus: { $ne: 'Complete' }
    }).sort({ voicePassDate: -1 });
    return res.json(urgentProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});

// Urgent Graphic Projects

// router.get('/urgentGraphicProjects', async (req, res) => {
//   try {
//     const currentMonth = new Date().getMonth() + 1;
//     const urgentProjects = await Customer.find({
//       graphicDesigner: person,
//       graphicPassDate: {
//         $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
//         $lte: new Date(new Date().getFullYear(), currentMonth, 0)
//       },
//       priority: 'Urgent',
//       graphicStatus: { $ne: 'Complete' }
//     }).sort({ graphicPassDate: -1 });
//     return res.json(urgentProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

router.get('/urgentGraphicProjects', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const isValidDate = (date) => date && new Date(date) >= startOfMonth && new Date(date) <= endOfMonth;

    const urgentCustomers = await Customer.find({
      priority: 'Urgent',
      graphicStatus: { $ne: 'Completed' }
    }).sort({ graphicPassDate: -1 });

    const urgentB2bCustomers = await B2bCustomer.find({
      priority: 'Urgent',
      graphicStatus: { $ne: 'Completed' }
    }).sort({ b2bGraphicPassDate: -1 });

    const urgentProjects = [];

    urgentCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.graphicDesigner === person && isValidDate(item.graphicPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person && isValidDate(sub.graphicPassDate)
      );

      if (mainValid) {
        urgentProjects.push({ ...item, subEntries: validSubEntries, type: 'Customer' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          urgentProjects.push({ ...sub, parentCustCode: item.custCode, type: 'Customer' });
        });
      }
    });

    urgentB2bCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.b2bGraphicDesigner === person && isValidDate(item.b2bGraphicPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person && isValidDate(sub.graphicPassDate)
      );

      if (mainValid) {
        urgentProjects.push({ ...item, subEntries: validSubEntries, type: 'b2b' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          urgentProjects.push({ ...sub, parentCustCode: item.custCode, type: 'b2b' });
        });
      }
    });

    return res.json(urgentProjects);
  } catch (error) {
    console.error("Error Fetching Urgent Projects", error);
    res.status(500).json({ error: 'Failed to fetch urgent projects' });
  }
});

// router.get('/pendingGraphicProjects', async (req, res) => {
//   try {
//     const startOfDay = new Date();
//     startOfDay.setHours(0, 0, 0, 0);
//     const pendingProjects = await Customer.find({
//       graphicDesigner: person,
//       graphicPassDate: { $lt: startOfDay },
//       graphicStatus: { $ne: 'Complete' }
//     }).sort({ graphicPassDate: -1 });
//     return res.json(pendingProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

router.get('/pendingGraphicProjects', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const isValidPendingDate = (date) => date && new Date(date) < startOfDay;

    const pendingCustomers = await Customer.find({
      graphicStatus: { $ne: 'Completed' }
    }).sort({ graphicPassDate: -1 });

    const pendingB2bCustomers = await B2bCustomer.find({
      graphicStatus: { $ne: 'Completed' }
    }).sort({ b2bGraphicPassDate: -1 });

    const pendingProjects = [];

    pendingCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.graphicDesigner === person && isValidPendingDate(item.graphicPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person && isValidPendingDate(sub.graphicPassDate)
      );

      if (mainValid) {
        pendingProjects.push({ ...item, subEntries: validSubEntries, type: 'Customer' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          pendingProjects.push({ ...sub, parentCustCode: item.custCode, type: 'Customer' });
        });
      }
    });

    pendingB2bCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.b2bGraphicDesigner === person && isValidPendingDate(item.b2bGraphicPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person && isValidPendingDate(sub.graphicPassDate)
      );

      if (mainValid) {
        pendingProjects.push({ ...item, subEntries: validSubEntries, type: 'b2b' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          pendingProjects.push({ ...sub, parentCustCode: item.custCode, type: 'b2b' });
        });
      }
    });

    return res.json(pendingProjects);
  } catch (error) {
    console.error("Error Fetching Pending Projects", error);
    res.status(500).json({ error: 'Failed to fetch pending projects' });
  }
});


// router.get('/todayGraphicProjects', async (req, res) => {
//   try {
//     const today = new Date();
//     const todayProjects = await Customer.find({
//       graphicDesigner: person,
//       graphicPassDate: {
//         $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
//         $lte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
//       },
//       graphicStatus: { $ne: 'Complete' }
//     }).sort({ graphicPassDate: -1 });
//     return res.json(todayProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

router.get('/todayGraphicProjects', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const isToday = (date) => date && new Date(date) >= startOfDay && new Date(date) <= endOfDay;

    const todayCustomers = await Customer.find({
      graphicStatus: { $ne: 'Completed' }
    }).sort({ graphicPassDate: -1 });

    const todayB2bCustomers = await B2bCustomer.find({
      graphicStatus: { $ne: 'Completed' }
    }).sort({ b2bGraphicPassDate: -1 });

    const todayProjects = [];

    todayCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.graphicDesigner === person && isToday(item.graphicPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person && isToday(sub.graphicPassDate)
      );

      if (mainValid) {
        todayProjects.push({ ...item, subEntries: validSubEntries, type: 'Customer' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          todayProjects.push({ ...sub, parentCustCode: item.custCode, type: 'Customer' });
        });
      }
    });

    todayB2bCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.b2bGraphicDesigner === person && isToday(item.b2bGraphicPassDate);
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person && isToday(sub.graphicPassDate)
      );

      if (mainValid) {
        todayProjects.push({ ...item, subEntries: validSubEntries, type: 'b2b' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          todayProjects.push({ ...sub, parentCustCode: item.custCode, type: 'b2b' });
        });
      }
    });

    return res.json(todayProjects);
  } catch (error) {
    console.error("Error Fetching Today's Projects", error);
    res.status(500).json({ error: "Failed to fetch today's projects" });
  }
});

// router.get('/changesGraphicProjects', async (req, res) => {
//   try {
//     const changesProjects = await Customer.find({
//       graphicDesigner: person,
//       graphicStatus: { $eq: 'Graphic Designing Changes' }
//     }).sort({ graphicPassDate: -1 });
//     return res.json(changesProjects)
//   } catch (error) {
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({ error: 'Failed to fetch Leads' })
//   }
// });

router.get('/changesGraphicProjects', async (req, res) => {
  try {
    const changesCustomers = await Customer.find({
      graphicStatus: 'Graphic Designing Changes'
    }).sort({ graphicPassDate: -1 });

    const changesB2bCustomers = await B2bCustomer.find({
      graphicStatus: 'Graphic Designing Changes'
    }).sort({ b2bGraphicPassDate: -1 });

    const changesProjects = [];

    changesCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.graphicDesigner === person;
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person
      );

      if (mainValid) {
        changesProjects.push({ ...item, subEntries: validSubEntries, type: 'Customer' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          changesProjects.push({ ...sub, parentCustCode: item.custCode, type: 'Customer' });
        });
      }
    });

    changesB2bCustomers.forEach(doc => {
      const item = doc.toObject();
      const mainValid = item.b2bGraphicDesigner === person;
      const validSubEntries = (item.subEntries || []).filter(sub =>
        sub.graphicDesigner === person
      );

      if (mainValid) {
        changesProjects.push({ ...item, subEntries: validSubEntries, type: 'b2b' });
      } else if (validSubEntries.length > 0) {
        validSubEntries.forEach(sub => {
          changesProjects.push({ ...sub, parentCustCode: item.custCode, type: 'b2b' });
        });
      }
    });

    return res.json(changesProjects);
  } catch (error) {
    console.error("Error Fetching Changes Projects", error);
    res.status(500).json({ error: 'Failed to fetch changes projects' });
  }
});

router.get('/todayEntriesGraphic', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      graphicDesigner: person,
      graphicPassDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/graphicActiveList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      graphicDesigner: person,
      graphicPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      graphicStatus: { $ne: 'Complete' }
    }).sort({ closingDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/graphicCompleteList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      graphicDesigner: person,
      graphicPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      graphicStatus: { $regex: /^Complete$/i }
    }).sort({ graphicPassDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allGraphicProjects', async (req, res) => {
  const allProjects = await Customer.find({ graphicDesigner: person }).sort({ closingDate: -1 });
  if (allProjects) {
    return res.json(allProjects)
  } else {
    res.send({ result: "No Data Found" })
  }
});

router.get('/todayAssignedTask', async (req, res) => {
  try {
    const today = new Date();
    const todayProjects = await Task.find({
      graphicDesigner: person,
      assignedDate: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
        $lte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      },
      graphicStatus: { $ne: 'Complete' }
    }).sort({ assignedDate: -1 });
    return res.json(todayProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});

router.get('/pendingAssignedTask', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const pendingProjects = await Task.find({
      graphicDesigner: person,
      assignedDate: { $lt: startOfDay },
      graphicStatus: { $ne: 'Complete' }
    }).sort({ assignedDate: -1 });
    return res.json(pendingProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to fetch Leads' })
  }
});
//Tasks

router.get('/taskDataLength', async (req, res) => {
  const taskLength = await Task.countDocuments();
  return res.json(taskLength);
});

router.post('/addTask', async (req, res) => {
  const task = new Task({
    SrNo: req.body.SrNo,
    taskName: req.body.taskName,
    taskDescription: req.body.taskDescription,
    assignedDate: req.body.assignedDate,
    graphicDesigner: req.body.graphicDesigner,
    graphicStatus: req.body.graphicStatus,
    assignedBy: req.body.assignedBy
  })
  await task.save().then((_) => {
    res.json({ success: true, message: "Task Added!!" })
  }).catch((err) => {
    res.json({ success: false, message: "Task Not Added!!" })
  })
});
//transfer leads to leads

router.post('/transferNewLeads', async (req, res) => {
  try {
    const { custId, salesTeam, closingDate, name } = req.body;
    if (!custId) {
      return res.status(404).json({ message: 'Customer Id is Required' });
    }
    const cust = await salesLead.findById(custId);
    if (!cust) {
      return res.status(404).json({ message: 'Customer Not Found' });
    }
    cust.transferBy = name;
    cust.newSalesTeam = salesTeam;
    await cust.save();
    const newSalesLead = new salesLead({
      custName: cust.custName,
      custNumb: cust.custNumb,
      custBussiness: cust.custBussiness,
      companyName: cust.companyName,
      salesTeam: salesTeam,
      remark: cust.remark,
      closingDate: closingDate,
      leadsCreatedDate: closingDate,
      transferBy: name,
      campaign_Name: 'Transfer By ' + cust.salesTeam
    })
    await newSalesLead.save();
    return res.status(200).json({ message: 'Customer transferred to salesLead Successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error transferring customer' });
  }
});

router.post('/transferCustomerToSalesLead', async (req, res) => {
  try {
    const { custId, salesTeam, closingDate, name } = req.body;
    if (!custId) {
      return res.status(404).json({ message: 'Customer Id is Required' });
    }
    const cust = await Customer.findById(custId);
    if (!cust) {
      return res.status(404).json({ message: 'Customer Not Found' });
    }
    cust.transferBy = name;
    cust.newSalesTeam = salesTeam;
    await cust.save();
    const newSalesLead = new salesLead({
      custName: cust.custName,
      custNumb: cust.custNumb,
      custBussiness: cust.custBussiness,
      companyName: cust.companyName,
      salesTeam: salesTeam,
      remark: cust.remark,
      closingDate: closingDate,
      leadsCreatedDate: closingDate,
      transferBy: name,
      campaign_Name: 'Transfer By ' + cust.salesTeam
    })
    await newSalesLead.save();
    return res.status(200).json({ message: 'Customer transferred to salesLead' });
  } catch (error) {
    return res.status(500).json({ message: 'Error transferring customer' });
  }
});
//get Campaign NAmes for leads

router.get('/getAllCampaignNames', async (req, res) => {
  try {
    const allLeads = await salesLead.find();
    return res.json(allLeads)
  } catch (error) {
    console.error('Error Fetching Leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getCampaignNames', async (req, res) => {
  try {
    const oneMonthAgo = moment().subtract(30, 'days').toDate();

    // Fetch leads from the last 7 days based on leadsCreatedDate
    const recentLeads = await salesLead.find({
      leadsCreatedDate: { $gte: oneMonthAgo },
      campaignType: { $ne: "WhatsApp API" }
    });

    // Extract unique campaign names
    const campaignNames = [...new Set(recentLeads.map(lead => lead.campaign_Name))];

    console.log("CAMPAIGN NAMES===========>>", campaignNames);
    return res.json(campaignNames);
  } catch (error) {
    console.error('Error Fetching Recent Campaign Leads:', error);
    res.status(500).json({ error: 'Failed to fetch recent campaign leads' });
  }
});

// whatsApp API Campaigns

router.get('/getWhatsAppCampaignNames', async (req, res) => {
  try {
    const oneMonthAgo = moment().subtract(30, 'days').toDate();

    const recentLeads = await salesLead.find({
      leadsCreatedDate: { $gte: oneMonthAgo },
      campaignType: { $eq: "WhatsApp API" }
    });
    const campaignNames = [...new Set(recentLeads.map(lead => lead.campaign_Name))];

    console.log("CAMPAIGN NAMES===========>>", campaignNames);
    return res.json(campaignNames);
  } catch (error) {
    console.error('Error Fetching Recent Campaign Leads', error);
    res.status(500).json({ error: 'Failed to fetch campaign leads' });
  }
});

// get all Closing Names

router.get('/getClosingNames', async (req, res) => {
  try {
    const allClosing = await Customer.find();
    return res.json(allClosing)
  } catch (error) {
    console.log("Error Fetching Closing:", error);
    res.status(500).json({ error: 'Failed to fetch Closing' });
  }
});

// all Closing

router.get('/allClosing', async (req, res) => {
  try {
    const closing = await ClosingCategory.find();
    return res.json(closing)
  } catch (error) {
    console.error("Error Fetching Closing: ", error);
    res.status(500).json({ error: 'Failed to fetch Closing' });
  }
});
// Data By Campaign

router.get('/dataByCampaign/:startDate/:endDate/:campaign', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const campaign = req.params.campaign;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: {
        $gte: startDate, $lte: endDate
      },
      campaign_Name: campaign
    };
    const campaignData = await salesLead.find(query);
    res.json(campaignData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});
//download Campaign Lead

router.get('/downloadCampaignLead/:startDate/:endDate/:campaign', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const campaign = req.params.campaign;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: {
        $gte: startDate, $lte: endDate
      },
      campaign_Name: campaign
    };
    const campaignData = await salesLead.find(query);
    const data = campaignData.map(customer => ({
      'Name': customer.custName,
      'Number': customer.custNumb,
      'Bussiness': customer.custBussiness,
      'Closing Date': customer.closingDate,
      'Campaign Name': customer.campaign_Name
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LeadsData');
    XLSX.writeFile(wb, 'LeadsData.xlsx');
    res.download('LeadsData.xlsx');
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});
// Data By Closing Campaign

router.get('/dataByClosingCamp/:startDate/:endDate/:campaign', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const campaign = req.params.campaign;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: {
        $gte: startDate, $lte: endDate
      },
      closingCateg: campaign
    };
    const campaignData = await Customer.find(query);
    res.json(campaignData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});
//download Category Campaign

router.get('/downloadCategoryCamp/:startDate/:endDate/:campaign', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const campaign = req.params.campaign;
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      closingDate: {
        $gte: startDate, $lte: endDate
      },
      closingCateg: campaign
    };
    const campaignData = await Customer.find(query);
    const data = campaignData.map(customer => ({
      'Name': customer.custName,
      'Number': customer.custNumb,
      'Bussiness': customer.custBussiness,
      'closing Date': customer.closingDate,
      'Campaign Name': customer.campaign_Name
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ClosingData');
    XLSX.writeFile(wb, 'ClosingData.xlsx');
    res.download('ClosingData.xlsx');
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});
// get Invoices

router.get('/getInvoice/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query1 = {
      date: {
        $gte: startDate, $lte: endDate
      },
      // custGST: { $ne: '' }
      billFormat: { $eq: 'GST' }
    };
    let query2 = {
      date: {
        $gte: startDate, $lte: endDate
      },
      // custGST: { $eq: '' }
      billFormat: { $eq: 'Non-GST' }
    };
    let query3 = {
      date: {
        $gte: startDate, $lte: endDate
      },
      billFormat: { $eq: 'Estimate' }
    }
    const invoiceData = await EstInvoice.find(query1);
    const nonGSTData = await EstInvoice.find(query2);
    const quotationData = await EstInvoice.find(query3);
    res.json({ invoiceData, nonGSTData, quotationData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});
//Incentives

// PUT route for adding or updating incentive
// router.put('/addIncentive', async (req, res) => {
//   try {
//     const { employeeName, category, incentives } = req.body;

//     // Check if the incentive entry for the employee and category already exists
//     let updatedIncentive;
//     const existingIncentive = await incentive.findOne({ employeeName, category });

//     if (existingIncentive) {
//       // Update existing incentive
//       updatedIncentive = await incentive.findOneAndUpdate(
//         { employeeName, category },
//         { $set: { incentives } },
//         { new: true }  // Return the updated document
//       );
//     } else {
//       // Create new incentive entry
//       const newIncentive = new incentive({
//         employeeName,
//         category,
//         incentives
//       });
//       updatedIncentive = await newIncentive.save();
//     }

//     res.json({ success: true, message: "Incentive Added or Updated Successfully!", data: updatedIncentive });
//   } catch (err) {
//     console.error("Error Adding/Updating Incentive:", err);
//     res.status(500).json({ success: false, message: "Error Adding/Updating Incentive" });
//   }
// });

router.put('/addIncentive', async (req, res) => {
  try {
    const { employeeName, incentives } = req.body;
    // Check if the incentive entry for the employee and category already exists
    let updatedIncentive;
    const existingIncentive = await incentive.findOne({ employeeName });
    if (existingIncentive) {
      // Update existing incentive
      updatedIncentive = await incentive.findOneAndUpdate(
        { employeeName },
        { $set: { incentives } },
        { new: true }  // Return the updated document
      );
    } else {
      // Create new incentive entry
      const newIncentive = new incentive({
        employeeName,
        incentives
      });
      updatedIncentive = await newIncentive.save();
    }
    res.json({ success: true, message: "Incentive Added or Updated Successfully!", data: updatedIncentive });
  } catch (err) {
    console.error("Error Adding/Updating Incentive:", err);
    res.status(500).json({ success: false, message: "Error Adding/Updating Incentive" });
  }
});

router.put('/addPoint', async (req, res) => {
  try {
    const { videoType, points } = req.body;

    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({ success: false, message: 'Points array is required' });
    }

    // You could use a fixed ID if this is a global singleton document
    let existing = await point.findOne({ videoType });
    let result;

    if (existing) {
      existing.points = points;
      result = await existing.save();
    } else {
      result = await new point({ videoType, points }).save();
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error saving points:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

router.get('/getPoints', async (req, res) => {
  try {
    const points = await point.findOne();
    res.json({ success: true, data: points.points });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching points' });
  }
});

router.get('/getPoint/:videoType', async (req, res) => {
  try {
    const { videoType } = req.params;
    const existing = await point.findOne({ videoType });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'No points found' });
    }

    res.json({ success: true, data: existing });
  } catch (err) {
    console.error('Error fetching points:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});


// const updateEditorMonthlyPoints = async (editorName) => {
//   console.log("EDITOR NAME==========>>", editorName);
//   const projects = await Customer.find({
//     signupUsername: editorName,
//     pointsCalculated: true, // ✅ Only pick processed ones
//     editorStatus: 'Completed'
//   });

//   const monthMap = {};

//   for (const project of projects) {
//     const monthKey = new Date(project.editorPassDate).toISOString().slice(0, 7); // "YYYY-MM"
//     const points = project.pointsEarned || 0;

//     if (!monthMap[monthKey]) {
//       monthMap[monthKey] = 0;
//     }

//     monthMap[monthKey] += points;
//   }

//   // Save per month
//   for (const [month, points] of Object.entries(monthMap)) {
//     await User.findOneAndUpdate(
//       { editor: editorName},
//       { $set: {
//   [`monthlyEditorPoints.${month}`]: points
// } },
//       { upsert: true }
//     );
//   }

//   return { monthsUpdated: Object.keys(monthMap).length };
// };

// const updateEditorMonthlyPoints = async (editorName) => {
//   console.log("EDITOR NAME==========>>", editorName);

//   const projects = await Customer.find({
//     editor: editorName,
//     pointsCalculated: true,
//     editorStatus: 'Completed'
//   });

//   const monthMap = {};
//   let totalPoints = 0;

//   for (const project of projects) {
//     const monthKey = new Date(project.editorPassDate).toISOString().slice(0, 7); // "YYYY-MM"
//     const points = project.pointsEarned || 0;

//     if (!monthMap[monthKey]) {
//       monthMap[monthKey] = 0;
//     }

//     monthMap[monthKey] += points;
//     totalPoints += points;
//   }

//   // Update monthly points
//   const updateObject = {};
//   for (const [month, points] of Object.entries(monthMap)) {
//     updateObject[`monthlyEditorPoints.${month}`] = points;
//   }

//   // Add total points
//   updateObject.totalEditorPoints = totalPoints;
//   updateObject.lastProjectUpdated = new Date();

//   // ✅ Fix: Use correct filter & update object
//   await User.findOneAndUpdate(
//     { signupUsername: editorName }, // ✅ Correct field
//     { $set: updateObject },         // ✅ Set multiple fields
//     { new: true }
//   );

//   return {
//     monthsUpdated: Object.keys(monthMap).length,
//     totalPoints
//   };
// };

const updateEditorMonthlyPoints = async (editorName) => {
  console.log("Updating monthly points for editor:", editorName);

  const projects = await Customer.find({
    $or: [
      { editor: editorName, editorStatus: 'Completed', pointsCalculated: true },
      { subEntries: { $elemMatch: { editor: editorName, editorStatus: 'Completed', pointsCalculated: true } } }
    ]
  });

  const monthMap = {};
  let totalPoints = 0;

  for (const project of projects) {
    const mainMatches = project.editor === editorName &&
      project.editorStatus === 'Completed' &&
      project.pointsCalculated;

    if (mainMatches) {
      const monthKey = new Date(project.editorPassDate).toISOString().slice(0, 7); // "YYYY-MM"
      const points = project.pointsEarned || 0;
      monthMap[monthKey] = (monthMap[monthKey] || 0) + points;
      totalPoints += points;
    }

    const subEntries = project.subEntries || [];
    for (const sub of subEntries) {
      const subMatches = sub.editor === editorName &&
        sub.editorStatus === 'Completed' &&
        sub.pointsCalculated;

      if (subMatches) {
        const monthKey = new Date(sub.editorPassDate).toISOString().slice(0, 7);
        const points = sub.pointsEarned || 0;
        monthMap[monthKey] = (monthMap[monthKey] || 0) + points;
        totalPoints += points;
      }
    }
  }

  // Build update object for User
  const updateObject = {
    totalEditorPoints: totalPoints,
    lastProjectUpdated: new Date()
  };

  for (const [month, points] of Object.entries(monthMap)) {
    updateObject[`monthlyEditorPoints.${month}`] = points;
  }

  // Update the User document
  await User.findOneAndUpdate(
    { signupUsername: editorName },
    { $set: updateObject },
    { new: true }
  );

  return {
    monthsUpdated: Object.keys(monthMap).length,
    totalPoints
  };
};


router.post('/update-editor-monthly-points', async (req, res) => {
  try {
    const { editorName } = req.body;
    console.log("EDITOR-========----->>", editorName);
    if (!editorName) {
      return res.status(400).json({ message: 'Editor name is required' });
    }

    const result = await updateEditorMonthlyPoints(editorName);
    res.status(200).json({
      message: `Monthly points updated for ${editorName}`,
      ...result
    });
  } catch (err) {
    console.error('Error updating monthly points:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// routes/editor.js (or wherever your routes are defined)

router.get('/all-editor-monthly-points', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"

    const editors = await User.find({
      signupRole: { $in: ['Editor'] }
    }).select('signupUsername monthlyEditorPoints');

    const formatted = editors.map(editor => ({
      username: editor.signupUsername,
      points: editor.monthlyEditorPoints?.get(currentMonth) || 0
    }));

    res.status(200).json({ editors: formatted });
  } catch (err) {
    console.error('Error fetching editor points:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


router.get('/allIncentive', async (req, res) => {
  try {
    const allIncentive = await incentive.find();
    return res.json(allIncentive)
  } catch (error) {
    console.log("Error Fetching Incentive:", error);
    res.status(500).json({ error: 'Failed to fetch Incentive' })
  }
});

// GET route to calculate incentive based on sales

router.get('/categoryAmount', async (req, res) => {
  const { year, month } = req.query;

  // Define the start and end of the current month
  const startMonth = moment().year(year).month(month - 1).startOf('month').toDate();
  const endMonth = moment().year(year).month(month - 1).endOf('month').toDate();

  try {
    // Step 1: Aggregate data for condition 1 (current month data)
    const condition1Results = await Customer.aggregate([
      {
        $match: {
          closingDate: { $gte: startMonth, $lte: endMonth },
          remainingAmount: 0,
          $or: [
            { restPaymentDate: null },
            { restPaymentDate: { $gte: startMonth, $lte: endMonth } },
            { restPaymentDate: { $lte: new Date(startMonth.getFullYear(), startMonth.getMonth() + 1, 10) } }
          ]
        }
      },
      {
        $group: {
          _id: { salesPerson: '$salesPerson' },
          numberOfClosings: { $sum: 1 },
          totalClosingPrice: { $sum: '$closingPrice' }
        }
      }
    ]);

    // Step 2: Aggregate data for condition 2 (previous months data)
    const condition2Results = await Customer.aggregate([
      {
        $match: {
          closingDate: { $not: { $gte: startMonth, $lte: endMonth } },
          remainingAmount: 0,
          $and: [
            { restPaymentDate: { $gte: startMonth, $lte: endMonth } },
            { restPaymentDate: { $gt: new Date(startMonth.getFullYear(), startMonth.getMonth(), 10) } }
          ]
        }
      },
      {
        $group: {
          _id: { salesPerson: '$salesPerson' },
          numberOfClosings: { $sum: 1 },
          totalClosingPrice: { $sum: '$closingPrice' }
        }
      }
    ]);

    // Combine results from both conditions
    const allResults = [
      ...condition1Results.map(result => ({ ...result, incentiveSource: 'currentMonth' })),
      ...condition2Results.map(result => ({ ...result, incentiveSource: 'previousMonths' }))
    ];

    // Step 3: Calculate totalClosingPrice sum and incentives for each salesperson
    const summary = {};

    // Sum up totalClosingPrice for each salesperson
    allResults.forEach(result => {
      const { salesPerson } = result._id;
      if (!summary[salesPerson]) {
        summary[salesPerson] = {
          salesPerson,
          totalClosingPrice: 0,
          numberOfClosings: 0,
        };
      }
      summary[salesPerson].totalClosingPrice += result.totalClosingPrice;
      summary[salesPerson].numberOfClosings += result.numberOfClosings;
    });

    // Calculate incentives for each salesperson
    for (const salesPerson in summary) {
      const salespersonData = summary[salesPerson];
      const totalSum = salespersonData.totalClosingPrice;

      // Fetch incentives for the salesperson
      const incentivess = await incentive.findOne({ employeeName: salesPerson });

      if (incentivess && incentivess.incentives) {
        let calculatedIncentive = 0;

        // Loop through incentive thresholds to calculate the correct incentive
        for (let threshold of incentivess.incentives) {
          if (totalSum >= threshold.amount) {
            calculatedIncentive = (totalSum - threshold.amount) * (threshold.increment / 100);
          }
        }

        salespersonData.calculatedIncentive = calculatedIncentive;
      } else {
        // No matching incentive found, set incentive to 0
        salespersonData.calculatedIncentive = 0;
      }
    }

    // Prepare the response
    const response = Object.values(summary);

    // Step 4: Send the final response
    if (response.length > 0) {
      console.log('Final Results:', response);
      res.json(response);
    } else {
      console.log('No sales entries found for the current month');
      res.json({ message: 'No sales entries found for the current month' });
    }
  } catch (error) {
    console.error('Error retrieving amounts and incentives:', error.message);
    res.status(500).json({ status: 'fail', error: error.message });
  }
});

// Sales Person Incentives

router.get('/salesIncentive', checkAuth, async (req, res) => {
  const { year, month } = req.query;
  const password = req.query.pass;
  const person1 = req.userData.name;
  // Define the date range for the current month
  const startMonth = moment().year(year).month(month - 1).startOf('month').toDate();
  const endMonth = moment().year(year).month(month - 1).endOf('month').toDate();

  try {
    // Step 1: Verify user's password
    const user = await User.findOne({ signupUsername: person1 });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.incentivePassword !== password) {
      return res.status(401).json({ message: 'Password not matched' });
    }
    console.log("Password verified");
    // Step 2: Aggregate data for condition 1 (remainingAmount = 0 and restPaymentDate = null)
    const condition1Results = await Customer.aggregate([
      {
        $match: {
          closingDate: { $gte: startMonth, $lte: endMonth },
          salesPerson: person1,
          remainingAmount: 0,
          $or: [{
            restPaymentDate: null
          },
          {
            restPaymentDate: { $gte: startMonth, $lte: endMonth }
          },
          {
            restPaymentDate: { $lte: new Date(startMonth.getFullYear(), startMonth.getMonth() + 1, 10) }
          }]
        }
      },
      {
        $group: {
          _id: { salesPerson: '$salesPerson' },
          numberOfClosings: { $sum: 1 },
          totalClosingPrice: { $sum: '$closingPrice' }
        }
      }
    ]);
    // Step 3: Aggregate data for condition 2 (remainingAmount = 0 and restPaymentDate in the current month)
    const condition2Results = await Customer.aggregate([
      {
        $match: {
          closingDate: {
            $not: { $gte: startMonth, $lte: endMonth }
          },
          salesPerson: person1,
          remainingAmount: 0,
          $and: [{
            restPaymentDate: { $gte: startMonth, $lte: endMonth }
          },
          {
            restPaymentDate: { $gt: new Date(startMonth.getFullYear(), startMonth.getMonth(), 10) }
          }]
          //restPaymentDate: { $gte: startMonth, $lte: endMonth }
        }
      },
      {
        $group: {
          _id: { salesPerson: '$salesPerson' },
          numberOfClosings: { $sum: 1 },
          totalClosingPrice: { $sum: '$closingPrice' }
        }
      }
    ]);
    // Step 4: Merge results and calculate incentives for each result
    //const allResults = [...condition1Results, ...condition2Results];
    const allResults = [
      ...condition1Results.map(result => ({ ...result, incentiveSource: 'currentMonth' })),
      ...condition2Results.map(result => ({ ...result, incentiveSource: 'previousMonths' }))
    ]
    const totalSum = allResults.reduce((acc, result) => {
      return acc + result.totalClosingPrice;
    }, 0);
    for (let result of allResults) {
      const { salesPerson } = result._id;
      const totalClosingPrice = result.totalClosingPrice;
      // Step 5: Fetch incentive thresholds for the salesperson
      const incentivess = await incentive.findOne({ employeeName: salesPerson });
      if (incentivess && incentivess.incentives) {
        let calculatedIncentive = 0;
        // Calculate incentive based on thresholds
        for (let threshold of incentivess.incentives) {
          if (totalClosingPrice >= threshold.amount) {
            calculatedIncentive = (totalSum - threshold.amount) * (threshold.increment / 100);
          }
        }
        result.calculatedIncentive = calculatedIncentive;
      } else {
        result.calculatedIncentive = 0;
      }
    }
    // Step 6: Send the final response
    if (allResults.length > 0) {
      console.log('Incentive Calculation Results:', allResults);
      res.json(allResults);
    } else {
      res.json({ message: 'No sales entries found for the current month' });
    }
  } catch (error) {
    console.error("Error retrieving incentives:", error.message);
    res.status(500).json({ status: "fail", error: error.message });
  }
});
//Bundles

router.get('/bundleActiveList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const bundles = await Customer.find({
      bundleHandler: person,
      bundlePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth)
      },
      bundleStatus: { $ne: 'Created' }
    }).sort({ bundlePassDate: -1 });
    res.json(bundles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/bundleCompleteList', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      bundleHandler: person,
      bundlePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth)
      },
      bundleStatus: { $regex: /^Created$/i }
    }).sort({ bundlePassDate: -1 });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/allBundleProjects', async (req, res) => {
  const allProjects = await Customer.find({ bundleHandler: person }).sort({ bundlePassDate: -1 });
  if (allProjects) {
    return res.json(allProjects)
  } else {
    res.send({ result: "No Data Found" })
  }
});

router.get('/bundleProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      bundleHandler: person,
      bundlePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    }).sort({ bundlePassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/bundlePreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      bundleHandler: person,
      bundlePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ bundlePassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/bundleTwoPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      bundleHandler: person,
      bundlePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 1)
      }
    }).sort({ bundlePassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

// Edit Invoice

router.get('/read-inv/:id', async (req, res) => {
  try {
    const invDetails = await EstInvoice.findById(req.params.id);
    if (invDetails) {
      return res.json(invDetails);
    } else {
      return res.json({ result: "No Invoice Found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Team Leader

router.get('/empAllProjects/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const fetchLeads = await Customer.find({
      salesPerson: name,
      closingDate: {
        $gte: startOfMonth,
        $lte: endOfToday
      }
    }).sort({ closingDate: -1 });
    return res.json(fetchLeads);
  } catch (error) {
    console.error("Error Fetching Closings", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' });
  }
});

router.get('/empProjects/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const fetchedClosing = await Customer.find({
      salesPerson: name,
      projectStatus: { $ne: 'Completed' }
    })
    return res.json(fetchedClosing);
  } catch (error) {
    console.error("Error Fetching Closing", error);
    res.status(500).json({ error: 'Failed to Fetch Closing' });
  }
});

router.get('/sales_closing/:closing/:name', async (req, res) => {
  const closing = req.params.closing;
  const name = req.params.name;
  try {
    const fetchedClosing = await Customer.find({
      salesPerson: name,
      closingCateg: closing,
      projectStatus: { $ne: 'Completed' }
    })
    return res.json(fetchedClosing);
  } catch (error) {
    console.error("Error Fetching Closing", error);
    res.status(500).json({ error: 'Failed to Fetch Closing' });
  }
});

router.get('/closing_status/:closing/:status', async (req, res) => {
  const closing = req.params.closing;
  const status = req.params.status;
  try {
    const fetching = await Customer.find({
      closingCateg: closing,
      projectStatus: status
    })
    return res.json(fetching);
  } catch (error) {
    console.error("Error Fetching Closing", error);
    res.status(500).json({ error: 'Failed to Fetch Closing' });
  }
});

router.get('/sales_status/:person/:status', async (req, res) => {
  const person = req.params.person;
  const status = req.params.status;
  console.log("PERSON STATUS=====>>", person, status);
  try {
    const fetching = await Customer.find({
      salesPerson: person,
      projectStatus: status
    })
    console.log("DATA DATATATATATATA==================>>", fetching);
    return res.json(fetching);
  } catch (error) {
    console.error("Error Fetching Closing", error);
    res.status(500).json({ error: 'Failed to fetch Closing' });
  }
});

router.get('/sales_statusClosing/:closing/:name/:status', async (req, res) => {
  const closing = req.params.closing;
  const name = req.params.name;
  const status = req.params.status;
  try {
    const fetching = await Customer.find({
      salesPerson: name,
      closingCateg: closing,
      projectStatus: status
    })
    console.log("ALL SET----->>", fetching);
    return res.json(fetching);
  } catch (error) {
    console.error("Error fetching Closing", error);
    res.status(500).json({ error: 'Failed to Fetch Closing' });
  }
});

router.get('/empStatus/:status', async (req, res) => {
  const status = req.params.status;
  try {
    const fetch = await Customer.find({
      projectStatus: status
    })
    return res.json(fetch);
  } catch (error) {
    console.error("Error Fetching Closing", error);
    res.status(500).json({ error: 'Failed to fetch Closing' });
  }
});

router.get('/empAllPrevProjects/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const currentMonth = new Date().getMonth() + 1;
    const previousMonthData = await Customer.find({
      salesPerson: name,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ closingDate: -1 });
    return res.json(previousMonthData);
  } catch (error) {
    console.error("Error Fetching Closings", error);
    res.status(500).json({ error: 'Failed to Fetch Closing' })
  }
});

router.get('/empAllTwoPrevProjects/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const currentMonth = new Date().getMonth() + 1;
    const previousTwoMonthData = await Customer.find({
      salesPerson: name,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ closingDate: -1 });
    return res.json(previousTwoMonthData);
  } catch (error) {
    console.error("Error Fetching Closing", error);
    res.status(500).json({ error: 'Failed to fetch Closing' })
  }
});

router.get('/allCategProjects/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const projects = await Customer.find({
      closingCateg: name,
      projectStatus: { $ne: 'Completed' }
    });
    if (projects.length > 0) {
      res.json(projects);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/searchCategProjects/:name/:mobile', async (req, res) => {
  const name = req.params.name;
  const mobile = req.params.mobile;

  try {
    const isNumeric = !isNaN(mobile);

    let searchCriteria = {
      "$or": [
        { custName: { $regex: mobile, $options: 'i' } },  // Fixed 'options' typo
        { custBussiness: { $regex: mobile, $options: 'i' } }
      ]
    };

    if (isNumeric) {
      searchCriteria["$or"].push({ custNumb: Number(mobile) });
    }

    let query = {
      closingCateg: name,
      ...searchCriteria // Merge search criteria
    };

    let data = await Customer.find(query);
    res.send(data);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error searching for customer");
  }
});

router.post('/update-projectStatusTeam', async (req, res) => {
  try {
    const items = req.body.items;
    for (const item of items) {
      let existingItem = await Customer.findById(item._id);
      if (existingItem) {
        existingItem.projectStatus = item.projectStatus;
        existingItem.remark = item.remark;
        existingItem.isHighlighted = item.isHighlighted;
        await existingItem.save();
      }
    }
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
});

router.get('/getEmpSalesTeamWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const todayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfToday,
        $lt: endOfToday
      },
      salesPerson: name
    }).sort({ closingDate: -1 });
    return res.json(todayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getEmpSalesYesterdayTeamWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      salesPerson: name
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getEmpSalesOneYesterdayTeamWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      salesPerson: name
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getEmpSalesTwoYesterdayTeamWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      salesPerson: name
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getEmpSalesThreeYesterdayTeamWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 4);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      salesPerson: name
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getEmpSalesFourYesterdayTeamWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 5);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      salesPerson: name
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/getEmpSalesFiveYesterdayTeamWork/:name', async (req, res) => {
  const name = req.params.name;
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 6);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    const yesterdayLeads = await salesLead.find({
      closingDate: {
        $gte: startOfYesterday,
        $lte: endOfYesterday
      },
      salesPerson: name
    }).sort({ closingDate: -1 });
    return res.json(yesterdayLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/remainingAmountProjects', async (req, res) => {
  try {
    const completeProducts = await Customer.find({
      remainingAmount: { $ne: 0 },
      projectStatus: { $regex: /^Completed$/i }
    }).sort({ closingDate: -1 });

    if (completeProducts.length > 0) {
      res.json(completeProducts);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// month wise comparision chart

router.get('/sales-data', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;  // JavaScript months are 0-based
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const salesData = await Customer.aggregate([
      {
        $match: {
          $or: [
            { $expr: { $and: [{ $eq: [{ $month: "$closingDate" }, currentMonth] }, { $eq: [{ $year: "$closingDate" }, currentYear] }] } },
            { $expr: { $and: [{ $eq: [{ $month: "$closingDate" }, lastMonth] }, { $eq: [{ $year: "$closingDate" }, lastMonthYear] }] } }
          ]
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$closingDate" },
            year: { $year: "$closingDate" },
            salesPerson: "$salesPerson"
          },
          totalSales: { $sum: "$closingPrice" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json(salesData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// const SPREADSHEETS = [
//   {
//     id: "1ZAQ2f-hZDPrxN55gFk8-BbSXniL4qMENQ6vOgLaEY8c", // Your Chirag Spreadsheet
//     sheets: ["Sheet1"], // List of sheet names
//   },
//   {
//     id: "1q9biTOLqq3EEBxIoCjLhP4qKJfMK6UPnz3VB9co1jtE", // Your Sanjana Multiple Leads Spreadsheet
//     sheets: ["Sheet1"], // You can list multiple sheets here
//   },
//   {
//     id: "1lrcxKuraGj-eFmp0-98Pow2vP6xtBLWIoIerzYNXkRY", // Your Parul Logo Animation Spreadsheet
//     sheets: ["Sheet1"], // You can list multiple sheets here
//   },
//   {
//     id: "1VmPRop99pC7EOzDMpId2WckKy9dhfz2UaiyKhNofYUc", // Your Sanjana Ayurveda Spreadsheet
//     sheets: ["Sheet1"], // You can list multiple sheets here
//   },
//   {
//     id: "1s3bwJ9urWqHrPd98ITHWcxql9Zjd2CLLadaq8TT-Eyo", // Your Lovely Multiple Leads Spreadsheet
//     sheets: ["Sheet1"], // You can list multiple sheets here
//   },
//   {
//     id: "1DVtyNL4csnW9y_IblMkrXthvWNoqLdremPmzH76XzvQ", // Your Yamini Ai Spreadsheet
//     sheets: ["Sheet1"], // You can list multiple sheets here
//   },
// ];

// const fetchAndSyncGoogleSheet = async () => {
//   try {
//     const authClient = await auth.getClient();

//     for (let spreadsheet of SPREADSHEETS) {
//       const { id: spreadsheetId, sheets: sheetNames } = spreadsheet;

//       // 👉 Fetch Spreadsheet metadata to get its title
//       const metadata = await sheets.spreadsheets.get({
//         auth: authClient,
//         spreadsheetId,
//       });
//       const spreadsheetTitle = metadata.data.properties.title;
//       console.log(`📄 Processing Spreadsheet: ${spreadsheetTitle}`);

//       for (let sheetName of sheetNames) {
//         const response = await sheets.spreadsheets.values.get({
//           auth: authClient,
//           spreadsheetId,
//           range: `${sheetName}!A2:T`,
//         });

//         const rows = response.data.values;
//         if (!rows || rows.length === 0) {
//           console.log(`No data found in spreadsheet: ${spreadsheetId}, sheet: ${sheetName}`);
//           continue;
//         }

//         const updates = []; // ➡️ Collect updates for batch write
//         const notifPromises = []; // ➡️ Collect notification promises
//         const contactPromises = []; // ➡️ Collect Google Contacts promises

//         for (let i = 0; i < rows.length; i++) {
//           const row = rows[i];
//           const custName = row[0];
//           const custNumb = row[1];
//           const existingClosingDate = row[10];
//           const campaign_Name = spreadsheetTitle;

//           if (existingClosingDate) {
//             console.log(`⏭️ Skipping existing record: ${custName} (${spreadsheetId} - ${sheetName})`);
//             continue;
//           }

//           const closingDate = new Date();

//           const existing = await salesLead.findOne({
//             custNumb,
//             closingDate: closingDate,
//           });

//           if (existing) continue;

//           const newCustomer = new salesLead({
//             closingDate,
//             custName,
//             custNumb,
//             campaign_Name,
//             salesTeam: "Sales Team 1",
//             leadsCreatedDate: closingDate,
//             campaignType: "WhatsApp API",
//           });

//           await newCustomer.save();
//           console.log(`✅ Inserted new customer: ${custName} (${spreadsheetId} - ${sheetName})`);

//           // Prepare notification
//           const notifTitle = "🎉 New WhatsApp Lead Alert!";
//           const notifBody = `New WhatsApp lead from ${campaign_Name} ${custName};`;

//           notifPromises.push(sendCampaignNotif(campaign_Name, notifTitle, notifBody));
//           console.log(`📩 Notification triggered for: ${custName}`);

//           // Prepare Google Contact
//           const formattedDate = closingDate.toISOString().slice(0, 10).split('-').reverse().join('');

//           contactPromises.push(
//             people.people.createContact({
//               requestBody: {
//                 names: [{ givenName: `${formattedDate} ${custName}` }],
//                 phoneNumbers: [{ value: `${custNumb}` }]
//               }
//             })
//           );
//           console.log(`📇 Contact creation triggered for: ${custName}`);

//           // Prepare closingDate update in Sheet
//           updates.push({
//             range: `${sheetName}!K${i + 2}`,
//             values: [[closingDate.toISOString()]],
//           });
//         }

//         // ✨ Wait for all notifications and contacts to finish
//         if (notifPromises.length > 0) {
//           await Promise.allSettled(notifPromises);
//           console.log(`✅ All notifications sent!`);
//         }

//         if (contactPromises.length > 0) {
//           await Promise.allSettled(contactPromises);
//           console.log(`✅ All contacts saved to Google Contacts!`);
//         }

//         // ✨ Batch update closing dates back to the sheet
//         if (updates.length > 0) {
//           await sheets.spreadsheets.values.batchUpdate({
//             auth: authClient,
//             spreadsheetId,
//             requestBody: {
//               valueInputOption: 'USER_ENTERED',
//               data: updates,
//             },
//           });
//           console.log(`📝 Batch updated ${updates.length} rows in spreadsheet: ${spreadsheetTitle} - ${sheetName}`);
//         }
//       }
//     }
//   } catch (error) {
//     console.error('❌ Error syncing Google Sheets:', error.message);
//   }
// };

function excelDateToJSDate(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Excel epoch starts on 1899-12-30
  return new Date(excelEpoch.getTime() + serial * 86400000); // 86400000 ms/day
}

// router.post('/uploadLead', upload.single('file'),checkAuth, async (req, res) => {
//   try {
//     const person1 = req.userData?.name;
//     const fileBuffer = req.file.buffer;
//     const fileExt = path.extname(req.file.originalname).toLowerCase();
//     const fileName = path.parse(req.file.originalname).name;
//     const currentDate = new Date();

//     // Load file based on extension
//     let workbook;
//     if (fileExt === '.csv') {
//       workbook = XLSX.read(fileBuffer.toString(), { type: 'string' });
//     } else if (fileExt === '.xlsx') {
//       workbook = XLSX.read(fileBuffer, { type: 'buffer' });
//     } else {
//       return res.status(400).json({ error: 'Unsupported file type' });
//     }

//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];
//     const rawData = XLSX.utils.sheet_to_json(sheet);

//     const mappedData = rawData.map(row => {
//       let parsedDate = currentDate;
//       const subscribedAt = row['Subscribed at'];

//       // Excel date serial number check
//       if (typeof subscribedAt === 'number') {
//         parsedDate = excelDateToJSDate(subscribedAt);
//       }

//       return {
//         custName: row['Name'] || '',
//         custNumb: row['Phone Number'] || '',
//         closingDate: parsedDate,
//         campaign_Name: `${person1} ${row['Label Name'] || ''}`,
//         label: row['Label Name'] || '',
//         leadsCreatedDate: parsedDate,
//         campaignType: "WhatsApp API"
//       };
//     });

//     await salesLead.insertMany(mappedData);
//     res.status(200).json({ message: 'Leads Upload Successful' });

//   } catch (err) {
//     console.error('Error Uploading Leads:', err);
//     res.status(500).json({ error: 'Failed to Upload Leads' });
//   }
// });

router.post('/uploadLead', upload.single('file'), checkAuth, async (req, res) => {
  try {
    const person1 = req.userData?.name;
    const fileBuffer = req.file.buffer;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const fileName = path.parse(req.file.originalname).name;
    const currentDate = new Date();

    let workbook;
    if (fileExt === '.csv') {
      workbook = XLSX.read(fileBuffer.toString(), { type: 'string' });
    } else if (fileExt === '.xlsx') {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    const mappedData = rawData.map(row => {
      let parsedDate = currentDate;
      const subscribedAt = row['Subscribed at'];
      if (typeof subscribedAt === 'number') {
        parsedDate = excelDateToJSDate(subscribedAt);
      }

      return {
        custName: row['Name'] || '',
        custNumb: row['Phone Number'] || '',
        closingDate: parsedDate,
        campaign_Name: `${person1} ${row['Label Name'] || ''}`,
        label: row['Label Name'] || '',
        leadsCreatedDate: parsedDate,
        campaignType: "WhatsApp API"
      };
    });

    // Filter out existing leads
    const filteredData = [];
    for (const lead of mappedData) {
      const exists = await salesLead.findOne({
        custNumb: lead.custNumb,
        closingDate: lead.closingDate
      });
      if (!exists) {
        filteredData.push(lead);
      }
    }

    if (filteredData.length > 0) {
      await salesLead.insertMany(filteredData);
    }

    res.status(200).json({
      message: 'Leads Upload Successful',
      inserted: filteredData.length,
      skipped: mappedData.length - filteredData.length
    });

  } catch (err) {
    console.error('Error Uploading Leads:', err);
    res.status(500).json({ error: 'Failed to Upload Leads' });
  }
});

//date wise leads Data

router.get('/getDateCampaign/:name', async (req, res) => {
  const name = req.params.name;
  const selectedDate = req.query.selectDate; // Get selected date and WhatsApp campaign from the query string

  try {
    const selectedDateObj = new Date(selectedDate); // Convert the date to a Date object
    const startOfDay = new Date(selectedDateObj.setHours(0, 0, 0, 0)); // Set to the start of the selected date
    const endOfDay = new Date(selectedDateObj.setHours(23, 59, 59, 999)); // Set to the end of the selected date

    const leads = await salesLead.find({
      campaign_Name: { $regex: new RegExp(name, 'i') }, // Filter by campaign name
      closingDate: {
        $gte: startOfDay, // Date range filter
        $lte: endOfDay
      }
    }).sort({ closingDate: -1 });
    return res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/closingCurrentMonth/:name', async (req, res) => {
  const name = req.params.name;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  try {
    const projects = await Customer.find({
      closingCateg: name,
      closingDate: {
        $gte: startOfMonth,
        $lte: endOfToday
      }
    });
    if (projects.length > 0) {
      res.json(projects);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/closingPrevMonth/:name', async (req, res) => {
  const name = req.params.name;
  const currentMonth = new Date().getMonth() + 1;
  try {
    const projectsPrev = await Customer.find({
      closingCateg: name,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    });
    if (projectsPrev.length > 0) {
      res.json(projectsPrev);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/closingTwoPrevMonth/:name', async (req, res) => {
  const name = req.params.name;
  const currentMonth = new Date().getMonth() + 1;
  try {
    const projectsTwoPrev = await Customer.find({
      closingCateg: name,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    });
    if (projectsTwoPrev.length > 0) {
      res.json(projectsTwoPrev);
    } else {
      res.json({ result: "No Data Found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//Video Google Drive Upload
function extractFileId(link) {
  const match = link.match(/\/d\/(.+?)\//);
  return match ? match[1] : null;
}

const GOOGLE_CLIENT_ID = '947642384135-m7sp5gqqnbceffs8nm4brsggr1qc9dol.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';
const GOOGLE_REDIRECT_URI = 'http://localhost:5000/auth/oauth2callback';

const oauth2ClientVideo = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);
const SCOPESVIDEO = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, 'token.json');

// --------- Step 1: Redirect to Google Auth ---------
router.get('/gAuth', (req, res) => {
  const url = oauth2ClientVideo.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPESVIDEO,
    prompt: 'consent'
  });
  res.redirect(url);
});

// --------- Step 2: Google redirects here with code ---------
router.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2ClientVideo.getToken(code);
    oauth2ClientVideo.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    res.send('Authentication successful! You can now upload files.');
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).send('Authentication failed');
  }
});

// --------- Step 3: Upload File to Drive ---------
const videoUpload = multer({ dest: 'uploads/' });
const cancelledUploads = new Set(); // Track cancelled uploads by temp file path

// router.post('/uploadToDrive', videoUpload.single('file'), async (req, res) => {
//   try {
//     const uploadId = req.body.uploadId;

//     if (!uploadId) {
//       return res.status(400).json({ success: false, error: 'Missing uploadId' });
//     }
//     if (cancelledUploads.has(uploadId)) {
//       console.log('Upload was cancelled before processing');
//       return res.status(499).json({ success: false, message: 'Upload cancelled by user' });
//     }
//     if (!fs.existsSync(TOKEN_PATH)) {
//       return res.status(401).send('Please authenticate at /gAuth first');
//     }
//     const token = fs.readFileSync(TOKEN_PATH);
//     oauth2ClientVideo.setCredentials(JSON.parse(token));

//     const drive = google.drive({ version: 'v3', auth: oauth2ClientVideo });

//     const tempFilePath = req.file.path;
//     const existingLink = req.body.existingLink;

//     // 🔴 If upload is cancelled, stop here
//     if (cancelledUploads.has(uploadId)) {
//       cancelledUploads.delete(uploadId);
//       if (fs.existsSync(tempFilePath)) {
//         fs.unlinkSync(tempFilePath);
//       }
//       return res.status(499).json({ success: false, message: 'Upload cancelled by user' });
//     }

//     //Get Month Name
//     const folderName = format(new Date(), 'MMMM yyyy');

//     const folderList = await drive.files.list({
//       q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
//       fields: 'files(id, name)',
//     });
//     let folderId;

//     if (folderList.data.files.length > 0) {
//       // Folder exists
//       folderId = folderList.data.files[0].id;
//     } else {
//       // Folder doesn't exist, create it
//       const folderMetadata = {
//         name: folderName,
//         mimeType: 'application/vnd.google-apps.folder',
//       };

//       const folder = await drive.files.create({
//         resource: folderMetadata,
//         fields: 'id',
//       });

//       folderId = folder.data.id;
//     }

//     const fileMetadata = {
//       name: req.file.originalname,
//       parents: [folderId]
//     };

//     const cancellableStream = new Readable({
//       read(size) {
//         if (cancelledUploads.has(uploadId)) {
//           console.log('Aborting stream due to cancellation');
//           this.destroy(new Error('Upload cancelled by user'));
//         } else {
//           const buffer = fs.readFileSync(tempFilePath);
//           this.push(buffer);
//           this.push(null); // Signal end of stream
//         }
//       }
//     });

//     const media = {
//       mimeType: req.file.mimetype,
//       body: cancellableStream
//     };
//     const response = await drive.files.create({
//       resource: fileMetadata,
//       media: media,
//       fields: 'id'
//     });

//     const fileId = response.data.id;

//     //Make file public
//     await drive.permissions.create({
//       fileId,
//       requestBody: {
//         role: 'reader',
//         type: 'anyone'
//       }
//     });

//     //Get shareable link
//     const result = await drive.files.get({
//       fileId,
//       fields: 'webViewLink, webContentLink'
//     });
//     // Delete old file only after successful upload
//     let oldFileDeleted = false;
//     if (existingLink) {
//       const match = existingLink.match(/\/d\/(.+?)\//);
//       const oldFileId = match ? match[1] : null;
//       if (oldFileId) {
//         try {
//           await drive.files.delete({ fileId: oldFileId });
//           console.log('Old file deleted');
//           oldFileDeleted = true;
//         } catch (err) {
//           console.warn('Failed to delete old file:', err.message);
//         }
//       }
//     }

//     //Clean up Local file
//     if (fs.existsSync(tempFilePath)) {
//       fs.unlinkSync(tempFilePath);
//     }
//     cancelledUploads.delete(uploadId);

//     res.json({
//       success: true,
//       webViewLink: result.data.webViewLink,
//       webContentLink: result.data.webContentLink,
//       oldFileDeleted,
//       tempFilePath
//     });
//   } catch (err) {
//     console.error('Upload error:', err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

router.post('/uploadToDrive', videoUpload.single('file'), async (req, res) => {
  const uploadId = req.body.uploadId;
  const existingLink = req.body.existingLink;

  if (!uploadId) {
    return res.status(400).json({ success: false, error: 'Missing uploadId' });
  }

  const tempFilePath = req.file?.path;

  try {
    // Early exit if upload already cancelled
    if (cancelledUploads.has(uploadId)) {
      console.log('Upload was cancelled before processing');
      return res.status(499).json({ success: false, message: 'Upload cancelled by user' });
    }

    if (!fs.existsSync(TOKEN_PATH)) {
      return res.status(401).send('Please authenticate at /gAuth first');
    }

    const token = fs.readFileSync(TOKEN_PATH);
    oauth2ClientVideo.setCredentials(JSON.parse(token));
    const drive = google.drive({ version: 'v3', auth: oauth2ClientVideo });

    // Create folder by month
    const folderName = format(new Date(), 'MMMM yyyy');

    const folderList = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id, name)',
    });

    let folderId;
    if (folderList.data.files.length > 0) {
      folderId = folderList.data.files[0].id;
    } else {
      const folder = await drive.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
      folderId = folder.data.id;
    }

    // Create cancellable stream
    const stream = fs.createReadStream(tempFilePath);

    stream.on('data', () => {
      if (cancelledUploads.has(uploadId)) {
        console.log('Cancelling during stream read');
        stream.destroy(new Error('Upload cancelled by user'));
      }
    });

    stream.on('error', (err) => {
      console.error('Stream error:', err.message);
    });

    const fileMetadata = {
      name: req.file.originalname,
      parents: [folderId],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: stream,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    const fileId = response.data.id;

    // Make file public
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get file links
    const result = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
    });

    // Delete old file if needed
    let oldFileDeleted = false;
    if (existingLink) {
      const match = existingLink.match(/\/d\/(.+?)\//);
      const oldFileId = match ? match[1] : null;
      if (oldFileId) {
        try {
          await drive.files.delete({ fileId: oldFileId });
          console.log('Old file deleted');
          oldFileDeleted = true;
        } catch (err) {
          console.warn('Failed to delete old file:', err.message);
        }
      }
    }

    return res.json({
      success: true,
      webViewLink: result.data.webViewLink,
      webContentLink: result.data.webContentLink,
      oldFileDeleted,
      tempFilePath,
    });

  } catch (err) {
    if (err.message === 'Upload cancelled by user') {
      return res.status(499).json({ success: false, message: 'Upload cancelled by user' });
    }

    console.error('Upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    // Always clean up
    cancelledUploads.delete(uploadId);

    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.warn('Failed to delete temp file:', err.message);
      });
    }
  }
});


router.post('/cancelUpload', (req, res) => {
  const { uploadId } = req.body;

  if (!uploadId) {
    return res.status(400).json({ success: false, error: 'uploadId missing' });
  }

  cancelledUploads.add(uploadId); // ⬅️ mark it as cancelled


  return res.json({ success: true, message: 'Upload cancelled, temp file deleted' });

});

// const videoAuth = new google.auth.GoogleAuth({
//   keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
//   scopes: ['https://www.googleapis.com/auth/drive'],
// });
// const videoDrive = google.drive({version: 'v3', auth: videoAuth});

// router.post('/uploadToDrive', videoUpload.single('file'), async(req,res) =>{
//   try{
//     const fileMetadata = {
//       name: req.file.originalname,
//       parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
//     };
//     const media = {
//       mimeType: req.file.mimetype,
//       body: fs.createReadStream(req.file.path),
//     };

//     const file = await videoDrive.files.create({
//       resource: fileMetadata,
//       media,
//       fields: 'id',
//     });

//     //make file public

//     await videoDrive.permissions.create({
//       fileId: file.data.id,
//       requestBody: {
//         role: 'reader',
//         type: 'anyone',
//       },
//     });

//     //Generate public link
//     const result = await videoDrive.files.get({
//       fileId: file.data.id,
//       fields: 'webViewLink, webContentLink',
//     });

//     fs.unlinkSync(req.file.path);
//     return res.json({ success: true, link: result.data.webViewLink});
//   }catch(error){
//     console.error('upload error: ', error);
//     res.status(500).json({success: false, error: error.message});
//   }
// });

// router.get('/getDateWhatsAppCampaign/:name', async(req,res)=>{
//   const name = req.params.name;
//   const selectedDate = req.query.selectDate;

//   try{
//     const selectedDateObj = new Date(selectedDate);
//     const startOfDay = new Date(selectedDateObj.setHours(0, 0, 0, 0));
//     const endOfDay = new Date(selectedDateObj.setHours(23,59,59,999));

//     const leads = await salesLead.find({
//       closingDate: {
//         $gte: startOfDay,
//         $lte: endOfDay
//       },
//       campaign_Name: {$regex: new RegExp(name, 'i')}
//     }).sort({closingDate: -1});
//     return res.json(leads);
//   }catch(error){
//     console.error('Error fetching leads: ', error);
//     res.status(500).json({error: 'Failed to fetcg leads'});
//   }
// });

module.exports = router;
module.exports.fetchAndSaveFacebookLeads = fetchAndSaveFacebookLeads;
module.exports.fetchAndSaveSecondFacebookLeads = fetchAndSaveSecondFacebookLeads;
module.exports.fetchAndSaveThirdFacebookLeads = fetchAndSaveThirdFacebookLeads;
//module.exports.fetchAndSyncGoogleSheet = fetchAndSyncGoogleSheet;
module.exports.reminder = reminder;
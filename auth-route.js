const router = require('express').Router();
const { google } = require('googleapis');
const fs = require('fs');
const FbAccessToken = require('./models/accessToken');
const newCompany = require('./models/company');
const B2bCustomer = require('./models/b2bProjects');
const User = require('./models/user');
const Customer = require('./models/newcustomer');
const ClosingCategory = require('./models/closingCategory');
const newSalesTeam = require("./models/newSalesTeam");
const Lead = require('./models/Leads');
const salesLead = require('./models/salesLead');
const transferLead = require('./models/adminLeads');
const Payroll = require('./models/payroll');
const { Country, State, City } = require('country-state-city');
//const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const checkAuth = require('./middleware/chech-auth');
const axios = require('axios');
const multer = require('multer');
const XLSX = require('xlsx');
const adminLeads = require('./models/adminLeads');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
    salesTeam: req.body.salesTeam
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
}
)

// Login Bellow 

router.post('/login', (req, res) => {
  User.findOne({ signupUsername: req.body.loginUsername }).exec()
    .then(user => {
      if (!user) {
        return res.json({ success: false, message: "User not found!!" });
      }
      if (req.body.loginPswd === user.signupPassword) {
        const payload = {
          userId: user._id,
          name: user.signupUsername,
          Saleteam: user.salesTeam,
          //
          signupRole: user.signupRole
        };
        const token = jwt.sign(payload, "webBatch", { expiresIn: '1h' });
        //person = req.body.loginUsername;
        return res.json({ success: true, token: token, role: user.signupRole, team: user.salesTeam, message: "Login Successful" });
      } else {
        return res.json({ success: false, message: "Password not Matched" });
      }
    })
    .catch(err => {
      res.json({ success: false, message: "Authentication Failed" });
    });
});

router.get('/profile', checkAuth, async (req, res) => {
  const userId = await req.userData.userId;
  person = req.userData.name;
  personTeam = req.userData.Saleteam;
  role = req.userData.signupRole;

  User.findById(userId).exec().then((result) => {
    console.log("data=====>>>>", person)
    console.log("SALESPERSON===>>>>", personTeam);
    return res.json({ success: true, data: result })
  }).catch(err => {
    res.json({ success: false, message: "Server Error!!" })
  })
})

// Monthwise Ongoing Projects

router.get('/list', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      salesPerson: person,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
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

router.get('/allList', async (req, res) => {
  console.log("person hjjj ==>", person);
  try {
    const products = await Customer.find({
      salesPerson: person,
      //remainingAmount: { $gt: 0 },
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
  console.log("person hjjj ==>", person);
  try {
    const products = await Customer.find({
      //remainingAmount: { $gt: 0 },
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
      //remainingAmount: 0,
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
    const currentMonth = new Date().getMonth() + 1;
    const fetchedLeads = await Customer.find({
      salesPerson: person,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    }).sort({ closingDate: -1 });
    return res.json(fetchedLeads);
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

// all previous Month projects

router.get('/allPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const previousMonthData = await Customer.find({
      salesPerson: person,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
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
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
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
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
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
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
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
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ closingDate: -1 });
    return res.json(previousTwoMonthData)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
})

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
})

//All Monthwise Ongoing Projects Admin

router.get('/allOngoingProjects', async (req, res) => {
  console.log("person ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
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

//All Complete projects

//router.get('/allCompleteProjects', async (req, res)=>{
//    const allComplete = await Customer.find({ remainingAmount :{$eq: 0} });
//    if(allComplete){
//        return res.json(allComplete)
//    }else{
//        res.send({result: "No Data Found"})
//    }
//})

router.get('/allCompleteProjects', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    const completeProducts = await Customer.find({
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: 0,
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

//router.get('/read-cust/:id', async (req, res)=>{
//    try {
//        const details = await Customer.findById(req.params.id);
//        if (details) {
//            return res.json(details);
//        } else {
//            return res.json({ result: "No Data" });
//        }
//    } catch (error) {
//        return res.status(500).json({ error: error.message });
//    }
//})

router.get('/read-cust/:id', async (req, res) => {
  try {
    // Search in the Customer collection
    const customerDetails = await Customer.findById(req.params.id);

    // Search in other collections, for example, OtherCollection
    const otherDetails = await salesLead.findById(req.params.id);

    // Check if any data found in either collection
    if (customerDetails) {
      return res.json(customerDetails);
    } else if (otherDetails) {
      return res.json(otherDetails);
    } else {
      return res.json({ result: "No Data" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

//get Employee

router.get('/read-emp/:id', async (req, res) => {
  try {
    const empDetails = await User.findById(req.params.id);
    if (empDetails) {
      console.log("Employee ==>", empDetails);
      return res.json(empDetails);
    } else {
      return res.json({ result: "No Employee Found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
})

//read company

router.get('/getCompanyPay/:id', async (req, res) => {
  try {
    const compDetails = await newCompany.findById(req.params.id);
    if (compDetails) {
      console.log("Company===>", compDetails);
      return res.json(compDetails);
    } else {
      return res.json({ result: "No Company Found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
})

// delete Emp

router.delete('/delete-emp/:id', async (req, res) => {
  try {
    const deleteData = await User.findByIdAndDelete(req.params.id);
    if (deleteData) {
      console.log("Delete ==>", deleteData);
      return res.json(deleteData);
    } else {
      return res.json({ result: "No Data Deleted" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
})

// Delete Customers

router.delete('/delete-cust/:id', async (req, res) => {
  try {
    const deleteCust = await Customer.findByIdAndDelete(req.params.id);
    if (deleteCust) {
      return res.json(deleteCust);
    } else {
      return res.json({ result: "No Data Deleted" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
})

// Edit Customer Details By editor

router.put('/updateEditor/:id', async (req, res) => {
  console.log("req.body ==>", req.body);
  const custDet = await Customer.findByIdAndUpdate(req.params.id, {
    $set: req.body
  })
  if (custDet) {
    return res.json(custDet)
  } else {
    res.send({ result: "No No Data" })
  }
})

// Edit Customer Details

router.put('/update/:id', async (req, res) => {
  try {
    console.log("UPDATE SALESPERSON==>", person);
    let custDet = await Customer.findById(req.params.id);
    let leadDet = await salesLead.findById(req.params.id);
    if (custDet) {
      custDet = await Customer.findByIdAndUpdate(req.params.id, {
        $set: req.body
      })
      return res.json(custDet)
    } else if (leadDet) {
      if (req.body.projectStatus === 'Not Interested') {
        leadDet = await salesLead.findByIdAndUpdate(req.params.id, {
          $set: req.body
        })
        return res.json(leadDet)
      } else {
        const newCustomer = new Customer({
          _id: leadDet._id,
          custCode: req.body.custCode,
          custName: leadDet.custName,
          custNumb: leadDet.custNumb,
          custEmail: leadDet.custEmail,
          custBussiness: leadDet.custBussiness,
          closingDate: req.body.closingDate,
          leadsCreatedDate: leadDet.closingDate,
          closingPrice: req.body.closingPrice,
          closingCateg: req.body.closingCateg,
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
          salesPerson: person,
          salesTeam: leadDet.salesTeam,
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
          scriptPassDate: req.body.scriptPassDate
        });
        await newCustomer.save();
        await salesLead.findByIdAndDelete(req.params.id);
        return res.json(newCustomer);
      }
    } else {
      return res.json({ result: "No Data" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Edit Employee

router.put('/updateEmp/:id', async (req, res) => {
  console.log("req.body ==>", req.body);
  const EmpDet = await User.findByIdAndUpdate(req.params.id, {
    $set: req.body
  })
  if (EmpDet) {
    return res.json(EmpDet)
  } else {
    res.send({ result: "No Employee Found" })
  }
})

//update Payment

router.put('/updatePay/:companyName/:signupName', async (req, res) => {
  try {
    const companyName = req.params.companyName;
    const signupName = req.params.signupName;
    const updatedPaymentInfo = req.body;

    let updatedCompany;

    // Check if the company exists
    const existingCompany = await newCompany.findOne({ companyName: companyName, signupName: signupName });

    if (existingCompany) {
      // If the company exists, update its payment information
      updatedCompany = await newCompany.findOneAndUpdate(
        { companyName: companyName, signupName: signupName }, // Query
        { $set: updatedPaymentInfo }, // Update
        { new: true } // Options: returns the modified document
      );
    } else {
      // If the company doesn't exist, create a new entry with the provided signupName
      const newEntry = { companyName: companyName, signupName: signupName, ...updatedPaymentInfo };
      updatedCompany = await new newCompany(newEntry).save();
    }

    res.status(200).json({ message: "Payment information updated successfully", company: updatedCompany });

  } catch (error) {
    console.error("Error updating payment information:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});




//Search Data

router.get('/searchCustomer/:mobile', async (req, res) => {
  try {
    let data = await Customer.find(
      {
        "$or": [
          // { custNumb: { $regex: req.params.mobile } },
          { custName: { $regex: req.params.mobile } }
        ]
      }
    )
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

router.get('/customerProject/:projectStatus', async (req, res) => {
  let data = await salesLead.find(
    {
      "$or": [
        { projectStatus: { $regex: req.params.projectStatus } }
      ]
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

router.post('/customer', async (req, res) => {
  const customer = new Customer({

    custCode: req.body.custCode,
    custName: req.body.custName,
    custNumb: req.body.custNumb,
    custBussiness: req.body.custBussiness,
    closingDate: req.body.closingDate,
    closingPrice: req.body.closingPrice,
    closingCateg: req.body.closingCateg,
    AdvPay: req.body.AdvPay,
    remainingAmount: req.body.remainingAmount,
    restAmount: req.body.restAmount,
    custCountry: req.body.custCountry,
    custCity: req.body.custCity,
    custState: req.body.custState,
    projectStatus: req.body.projectStatus,
    salesPerson: req.body.salesPerson,
    youtubeLink: req.body.youtubeLink,
    remark: req.body.remark,
    editor: req.body.editor,
    scriptWriter: req.body.scriptWriter,
    voiceOver: req.body.voiceOver,
    salesTeam: req.body.salesTeam,
    companyName: req.body.companyName,
    scriptPassDate: req.body.scriptPassDate

  })

  await customer.save()
    .then((_) => {
      res.json({ success: true, message: "User Added!!" })
    })
    .catch((err) => {
      res.json({ success: false, message: "User Not Added!!" })
    })
})

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
  console.log("State===>", states);
  res.json(states);
});

router.get('/cities/:countryCode/:stateCode', (req, res) => {
  const { countryCode } = req.params;
  const { stateCode } = req.params;
  const cities = City.getCitiesOfState(countryCode, stateCode);
  console.log("City===>", cities);
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
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
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

// total Month rest Amount Received

router.get('/totalRecvAmount', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      restPaymentDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
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

router.get('/totalEntriesEmp', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      salesPerson: person,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
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

// router.get('/totalEntries', async (req, res) => {

//   const currentMonth = new Date().getMonth() + 1;
//   console.log("Month person1 ==>", person);
//   try {
//     let query;
//     if (person === 'Shiva Varshney') {
//       query = {
//         closingDate: {
//           $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
//           $lte: new Date(new Date().getFullYear(), currentMonth, 0)
//         }
//       };
//     } else {
//       query = {
//         salesPerson: person,
//         closingDate: {
//           $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
//           $lte: new Date(new Date().getFullYear(), currentMonth, 0)
//         }
//       };
//     }

//    const totalEntries = await Customer.find(query);
//     const totalAmount = totalEntries.reduce((sum,doc)=> sum + doc.closingPrice, 0);
//     const totalRecv = totalEntries.reduce((sum, doc)=> sum + doc.AdvPay, 0);
//     const totalDue = totalEntries.reduce((sum,doc)=> sum + doc.remainingAmount, 0);
//     res.json({totalEntries,totalAmount, totalRecv, totalDue});
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server Error' });
//   }
// });


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
    console.log("Total Entries===>>", totalDayEntry)
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/todayEntriesEmp', async (req, res) => {
  const currentDate = new Date();
  try {
    let query;
    query = {
      salesPerson: person,
      closingDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    console.log("Total Entries===>>", totalDayEntry)
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//router.get('/todayEntries', async( req, res)=>{
//  const currentDate = new Date();
//  try{
//    let query;
//    if(person === 'Shiva Varshney'){
//      query = {
//        closingDate : {
//          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
//          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
//        }
//      };
//    } else{
//      query = {
//        salesPerson : person,
//       closingDate : {
//         $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
//         $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
//       }
//     };
//   }
//   const totalDayEntry = await Customer.find(query);
//   console.log("Total Entries===>>",totalDayEntry)
//   res.json({totalDayEntry});
// } catch(error){
//   console.log(error);
//   res.status(500).json({message: "Server Error"});
// }
//});

//Data By Date Range

router.get('/dataByRange/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query;
    if (role === 'Admin' || role === 'Manager') {
      query = {
        closingDate: {
          $gte: startDate, $lte: endDate
        }
      };
    } else {
      query = {
        salesPerson: person,
        closingDate: {
          $gte: startDate, $lte: endDate
        }
      };
    }
    const rangeTotalData = await Customer.find(query);
    const rangeTotalAmount = rangeTotalData.reduce((sum, doc) => sum + doc.closingPrice, 0);
    const rangeTotalRecv = rangeTotalData.reduce((sum, doc) => sum + doc.AdvPay, 0);
    const rangeTotalDue = rangeTotalData.reduce((sum, doc) => sum + doc.remainingAmount, 0);
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
})

//Excel Upload

router.post('/uploadFile', upload.single('file'), async (req, res) => {
  //await Customer.deleteMany();
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    await Customer.insertMany(data);
    res.status(200).json({ message: 'Data Upload Successfulll' });
  } catch (err) {
    console.error("Error Uploading File", err);
    res.status(500).json({ error: "Failed to Upload File" });
  }
})

//donwload Excel

router.get('/downloadFile', async (req, res) => {
  const currentMonth = new Date().getMonth() + 1;
  console.log("person ==>", person);
  try {
    let query;
    if (role === 'Admin' || role === 'Manager') {
      query = {
        closingDate: {
          $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
          $lte: new Date(new Date().getFullYear(), currentMonth, 0)
        }
      };
    } else {
      query = {
        salesPerson: person,
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
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch (err) {
    console.error('Error Downloading File', err);
    res.status(500).json({ error: 'Failed to download File' });
  }
});

router.get('/downloadRangeFile/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  console.log("DOwnload PersonTeam===>", personTeam)
  try {
    let query;
    if (role === 'Admin' || role === 'Manager') {
      query = {
        closingDate: {
          $gte: startDate, $lte: endDate
        }
      };
    } else {
      query = {
        salesPerson: person,
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
  console.log("DOwnload PersonTeam===>", personTeam)
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

router.get('/downloadDueFile/:startDate/:endDate', async (req, res) => {
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
        remainingAmount: { $gt: 0 }
      };
    } else {
      query = {
        salesPerson: person,
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
      console.log("Delete ==>", deleteData);
      return res.json(deleteData);
    } else {
      return res.json({ result: "No Data Deleted" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
})

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
// const REFERESH_TOKEN = '1//04Si-mrqfDFW7CgYIARAAGAQSNwF-L9IrEwuDaMHbX6mNQQURq9yo0sNPeLnfFKe5lmralufmeLDadGbSjfSnzQnD-XW_KIfyyz4';

// AdmixmediaIndia
const CLIENT_ID = '163851234056-46n5etsovm4emjmthe5kb6ttmvomt4mt.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const REFERESH_TOKEN = '1//04fb5xX2u1iOfCgYIARAAGAQSNwF-L9IrT1VTQqTxCkAwbM2LVBTk_gmStDXgy21PPDkwww9OPCDxNy1pXZEVbYEYCoF-zH4R6mA';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFERESH_TOKEN })

// const drive = google.drive({
//   version: 'v3',
//   auth: oauth2Client
// });
const people = google.people({
  version: 'v1',
  auth: oauth2Client
});

router.get('/salesFacebook-leads', async (req, res) => {
  //await Lead.deleteMany();
  try {
    //Local
    //const response = await axios.get(`https://graph.facebook.com/v19.0/me?fields=adaccounts%7Bid%2Ccampaigns%7Bid%2Cname%2Cads%7Bname%2Cleads%7D%7D%7D&access_token=${accessToken}`);
    //Real
    const accessToken1 = await FbAccessToken.findOne();
    const response = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id%2Cadaccounts%7Bcampaigns%7Bid%2Cname%2Cads%7Bname%2Cleads%7D%7D%7D&access_token=${accessToken1.newAccessToken}`);
    const leadsData = response.data.adaccounts.data;
    let cust_name, company_name, phone, state, email = '';

    for (const leadData of leadsData) {
      const campaigns = leadData.campaigns.data;
      const tempLeadsData = [];

      for (const campaign of campaigns) {
        const { id: campId, name: campName, ads } = campaign;

        for (const ad of ads.data) {
          const { name: adName, leads } = ad;

          if (leads && leads.data) {
            for (const lead of leads.data) {
              const { created_time: createdTime, field_data } = lead;

              let existingLead = await salesLead.findOne({ closingDate: lead.created_time });

              if (existingLead) {

                existingLead.salesTeam = personTeam;
                await existingLead.save();

              }

              if (!existingLead) {

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


                let customerLead = await Customer.findOne({ leadsCreatedDate: createdTime });
                if (!customerLead) {
                  const newLead = new salesLead({
                    id: leadData.id,
                    closingDate: createdTime,
                    campaign_Name: campName,
                    ad_Name: adName,
                    custName: cust_name,
                    custEmail: email,
                    custBussiness: company_name,
                    custNumb: phone,
                    state: state,
                    salesTeam: personTeam,
                    leadsCreatedDate: createdTime
                  });
                  await newLead.save();
                  tempLeadsData.push({ custName: `${formatDate(createdTime)} ${cust_name}`, custNumb: phone });
                  function formatDate(timestamp) {
                    const date = new Date(timestamp);
                    const day = String(date.getDate()).padStart(2, '0'); // Get day with leading zero if necessary
                    const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month with leading zero if necessary
                    const year = String(date.getFullYear()).slice(-2);
                    return `${day}${month}${year}`;
                  }
                } else {
                  console.log("All leads Stored");
                }
              }
            }
          }
        }
      }

      // Prepare VCF data
      // let vcfContent = "";
      // tempLeadsData.forEach(function (lead) {
      //   vcfContent += `BEGIN:VCARD\n`;
      //   vcfContent += `VERSION:3.0\n`;
      //   vcfContent += `FN:${lead.custName}\n`;
      //   vcfContent += `TEL:${lead.custNumb}\n`;
      //   vcfContent += `END:VCARD\n`;
      // });

      // const tempFilePath = 'extracted_leads.vcf';
      // fs.writeFileSync(tempFilePath, vcfContent)
      // const driveResponse = await drive.files.create({
      //   requestBody: {
      //     name: 'Facebook-leads.vcf',
      //     mimeType: 'text/vcard'
      //   },
      //   media: {
      //     mimeType: 'text/vcard',
      //     body: fs.createReadStream(tempFilePath)
      //   }
      // });

      tempLeadsData.forEach(async (lead) => {
        const contact = {
          names: [{
            givenName: lead.custName
          }],
          phoneNumbers: [{
            value: lead.custNumb
          }]
        };
        try {
          const res = await people.people.createContact({
            requestBody: contact
          });
        } catch (error) {
          console.error("Error Creating Contact", error);
        }
      })

    }
    //res.json({ success: true, fileId: driveResponse.data.id }); 
    res.json({ success: true });
  } catch (error) {
    console.error('Error fetching and saving Facebook leads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

//router.post('/update-salespersons', async (req,res)=>{
//  try{
//    const items = req.body.items;
//    const updatedItems = items.map(item=> ({
//      _id: item._id,
//      closingDate: item.created_time,
//      campaign_Name: item.campaign_Name,
//      ad_Name: item.ad_Name,
//      custName: item.name,
//      custEmail: item.email,
//      custBussiness: item.company_name,
//      custNumb: item.phone,
//      state: item.state,
//      salesPerson: item.salesperson
//    }));
//  await salesLead.insertMany(updatedItems);

//    res.json({message: "Items Updated Successfully"});
//  }catch(err){
//    res.status(500).json({ message: err.message});
//  }
//});

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
    console.log("Leads Data===>", rangeTotalData);
    res.json({ rangeTotalData: rangeTotalData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

//get Teams Leads

//  router.get('/getTeams-leads/', async(req,res)=>{
//    try{
//      //const team = req.params.data;
//      console.log("Sales Team===>>",personTeam);
//      const fetchedLeads = await salesLead.find({salesTeam: personTeam}).sort({ closingDate: -1 });
//      res.json(fetchedLeads);
//    }catch(error){
//      res.status(500).json({error: 'Dailed to fetch Leads'})
//    }
//  })

router.get('/getTeams-leads/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Start of today
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // End of today
    console.log("STart Date==>", startOfToday);
    console.log("End Date===>", endOfToday);
    // Fetch leads with closing date within today's range
    const todayLeads = await salesLead.find({
      salesTeam: personTeam,
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

router.get('/getSalesTeamWork/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // Start of today
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // End of today
    console.log("STart Date==>", startOfToday);
    console.log("End Date===>", endOfToday);
    // Fetch leads with closing date within today's range
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

router.get('/getYesterdayTeams-leads/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
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

router.get('/getSalesYesterdayTeamWork/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
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

router.get('/getOneYesterdayTeams-leads/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
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

router.get('/getSalesOneYesterdayTeamWork/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 2);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
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

router.get('/getTwoYesterdayTeams-leads/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
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

router.get('/getSalesTwoYesterdayTeamWork/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 3);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
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

router.get('/getThreeYesterdayTeams-leads/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 4);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
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

router.get('/getSalesThreeYesterdayTeamWork/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 4);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
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

router.get('/getFourYesterdayTeams-leads/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 5);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
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

router.get('/getSalesFourYesterdayTeamWork/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 5);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
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

router.get('/getFiveYesterdayTeams-leads/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 6);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
    const yesterdayLeads = await salesLead.find({
      salesTeam: personTeam,
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

router.get('/getSalesFiveYesterdayTeamWork/', async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 6);
    const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
    console.log("YesterdayStart==>", startOfYesterday);
    console.log("YestaerdayEnd===>", endOfYesterday);
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

// router.get('/getSales-leads', async(req, res)=>{
//   try{
//     const fetchedLeads = await Customer.find({salesTeam: personTeam}).sort({ closingDate: -1 });
//     res.json(fetchedLeads);
//   }catch(error){
//     console.error("Error Fetching Leads", error);
//     res.status(500).json({error: 'Failed to Fetch Leads'})
//   }
// });

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
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ closingDate: -1 });
    const previousTwoMonthLeads = await Customer.find({
      salesTeam: personTeam,
      closingDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ closingDate: -1 });
    res.json({ fetchedLeads, previousMonthLeads, previousTwoMonthLeads });
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

// SalesLead by Range

router.get('/salesleadsByRange/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      salesTeam: personTeam,
      closingDate: {
        $gte: startDate, $lte: endDate
      }
    };
    const rangeTotalData = await salesLead.find(query).sort({ closingDate: -1 });
    console.log("Leads Data===>", rangeTotalData);
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
    console.log("Leads Data===>", rangeTotalData);
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
          console.log("Check SalesTeam==>>", salesLead.salesTeam);
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
        await existingItem.save();
      }
    }
    res.json({ message: "Editor Updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})

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
    console.log("Total Entries===>>", totalDayEntry)
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/scriptActiveList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
      scriptStatus: { $ne: 'Complete' }
    }).sort({ closingDate: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/scriptCompleteList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      scriptWriter: person,
      scriptPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
      scriptStatus: { $regex: /^Complete$/i }
    }).sort({ closingDate: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//Editor Projects

router.get('/allEditorProjects', async (req, res) => {
  const allProjects = await Customer.find({ editor: person, companyName: "AdmixMedia" }).sort({ closingDate: -1 });
  if (allProjects) {
    return res.json(allProjects)
  } else {
    res.send({ result: "No Data Found" })
  }
});

router.get('/editorProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      editor: person,
      companyName: "AdmixMedia",
      editorPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      }
    }).sort({ editorPassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/editorPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      editor: person,
      companyName: "AdmixMedia",
      editorPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
        $lte: new Date(new Date().getFullYear(), currentMonth - 1, 1)
      }
    }).sort({ editorPassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
  }
});

router.get('/editorTwoPreviousProjects', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const allProjects = await Customer.find({
      editor: person,
      companyName: "AdmixMedia",
      editorPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
      }
    }).sort({ editorPassDate: -1 });
    return res.json(allProjects)
  } catch (error) {
    console.error("Error Fetching Leads", error);
    res.status(500).json({ error: 'Failed to Fetch Leads' })
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
      companyName: "AdmixMedia",
      editorPassDate: {
        $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
        $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
      }
    };
    const totalDayEntry = await Customer.find(query);
    console.log("Total Entries===>>", totalDayEntry)
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/editorActiveList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      editor: person,
      companyName: "AdmixMedia",
      editorPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth)
      },
      //remainingAmount: { $gt: 0 },
      editorStatus: { $ne: 'Completed' }
    }).sort({ closingDate: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/editorCompleteList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      editor: person,
      companyName: "AdmixMedia",
      editorPassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth)
      },
      //remainingAmount: { $gt: 0 },
      editorStatus: { $regex: /^Completed$/i }
    }).sort({ closingDate: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);
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
    console.log("Total Entries===>>", totalDayEntry)
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/editorOtherActiveList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await B2bCustomer.find({
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
      projectStatus: { $ne: 'Completed' }
    }).sort({ b2bProjectDate: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/editorOtherCompleteList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await B2bCustomer.find({
      b2bEditor: person,
      companyName: { $ne: "AdmixMedia" },
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
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
    console.log("Total Entries===>>", totalDayEntry)
    res.json({ totalDayEntry });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get('/voActiveList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
      voiceOverStatus: { $ne: 'Complete' }
    }).sort({ closingDate: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/voCompleteList', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await Customer.find({
      voiceOver: person,
      voicePassDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
      voiceOverStatus: { $regex: /^Complete$/i }
    }).sort({ closingDate: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// update Project Status from Admin Panel

router.post('/update-projectStatus', async (req, res) => {
  try {
    const items = req.body.items;
    for (const item of items) {
      let existingItem = await salesLead.findById(item._id);

      if (existingItem) {
        existingItem.projectStatus = item.projectStatus;
        existingItem.remark = item.remark;
        await existingItem.save();
      }
    }
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
});

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
    b2bVideoDurationMinutes: req.body.b2bVideoDurationMinutes,
    b2bVideoDurationSeconds: req.body.b2bVideoDurationSeconds,
    b2bEditor: req.body.b2bEditor,
    youtubeLink: req.body.youtubeLink,
    b2bRemark: req.body.b2bRemark,
    salesPerson: req.body.salesPerson,
    salesTeam: req.body.salesTeam,
    projectStatus: req.body.projectStatus
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
  const currentMonth = new Date().getMonth() + 1;
  try {
    let query;
    query = {
      salesPerson: person,
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
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
    let query;
    query = {
      salesPerson: person,
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

router.get('/listB2b', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth() + 1;
  try {
    const products = await B2bCustomer.find({
      salesPerson: person,
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: { $gt: 0 },
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
  console.log("person hjjj ==>", person);
  try {
    const products = await B2bCustomer.find({
      salesPerson: person,

      //remainingAmount: { $gt: 0 },
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
      salesPerson: person,
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
        $lte: new Date(new Date().getFullYear(), currentMonth, 0)
      },
      //remainingAmount: 0,
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
      salesPerson: person,
      //remainingAmount: 0,
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
      salesPerson: person,
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 2, 2),
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
      salesPerson: person,
      b2bProjectDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth - 3, 3),
        $lte: new Date(new Date().getFullYear(), currentMonth - 2, 2)
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
  console.log("person ==>", person);
  try {
    let query;
    query = {
      salesPerson: person,
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
  console.log("DOwnload PersonTeam===>", personTeam)
  try {
    let query;
    query = {
      salesPerson: person,
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
  console.log("req.body ==>", req.body);
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
  console.log("req.body ==>", req.body);
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
      salesTeam: req.body.salesTeam,
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
    if(response.status === 200){
      res.json({success: true, message: "New Lead & Contact Added!!"})
    }else{
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
    console.log(`${result.matchedCount} documents matched the query criteria.`);
    console.log(`${result.modifiedCount} documents were updated.`);
    return (result.modifiedCount);
  } catch (err) {
    console.error(err);
  }
});

//Payroll System

router.get('/dataByTm/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try{
    let query = {
      closingDate: { $gte: startDate, $lte: endDate},
      $or: [
        { editor: tmName },
        { scriptWriter: tmName },
        { voiceOver: tmName }
      ]
    };
    const totalData = await Customer.find(query);
    res.json(totalData);
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.get('/dataByEditorPayment/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try{
    let query1={
      closingDate: {$gte: startDate, $lte: endDate},
      editor: tmName,
      editorStatus: { $regex: /^Completed$/i }
    };
    const completeProjects = await Customer.find(query1);
    let query2={
      closingDate: {$gte: startDate, $lte: endDate},
      editor: tmName,
      editorStatus: { $ne: 'Completed'}
    }
    const inCompleteProjects = await Customer.find(query2);
    let query3={
      closingDate: {$gte: startDate, $lte: endDate},
      editor: tmName,
      EditorPaymentStatus: {$ne: 'Transfered'},
      editorStatus: {$regex: /^Completed$/i}
    }
    const totalData= await Customer.find(query3);
    const paybalAmount = totalData.reduce((sum,doc)=> sum + doc.totalEditorPayment, 0);
    res.json({completeProjects, inCompleteProjects, paybalAmount});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.get('/dataByScriptPayment/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try{
    let query1={
      closingDate: {$gte: startDate, $lte: endDate},
      scriptWriter: tmName,
      scriptStatus: { $regex: /^Complete$/i }
    };
    const completeProjects = await Customer.find(query1);
    let query2={
      closingDate: {$gte: startDate, $lte: endDate},
      scriptWriter: tmName,
      scriptStatus: { $ne: 'Complete'}
    }
    const inCompleteProjects = await Customer.find(query2);
    let query3={
      closingDate: {$gte: startDate, $lte: endDate},
      scriptWriter: tmName,
      scriptStatus: {$regex: /^Complete$/i},
      ScriptPaymentStatus: {$ne: 'Transfered'}
    }
    const totalData= await Customer.find(query3);
    const paybalAmount = totalData.reduce((sum,doc)=> sum + doc.totalScriptPayment, 0);
    res.json({completeProjects, inCompleteProjects, paybalAmount});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.get('/dataByVoPayment/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try{
    let query1={
      closingDate: {$gte: startDate, $lte: endDate},
      voiceOver: tmName,
      voiceOverStatus: { $regex: /^Complete$/i }
    };
    const completeProjects = await Customer.find(query1);
    let query2={
      closingDate: {$gte: startDate, $lte: endDate},
      voiceOver: tmName,
      voiceOverStatus: { $ne: 'Complete'}
    }
    const inCompleteProjects = await Customer.find(query2);
    let query3={
      closingDate: {$gte: startDate, $lte: endDate},
      voiceOver: tmName,
      voiceOverStatus: {$regex: /^Complete$/i},
      VoiceOverPaymentStatus: {$ne: 'Transfered'}
    }
    const totalData= await Customer.find(query3);
    const paybalAmount = totalData.reduce((sum,doc)=> sum + doc.totalVoicePayment, 0);
    res.json({completeProjects, inCompleteProjects, paybalAmount});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

//update Payroll Payment

router.put('/editorPayrollUpdate/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate()+1);
  try{
    let query={
      closingDate: {$gte: startDate, $lte: endDate},
      editor: tmName,
      editorStatus: {$regex: /^Completed$/i}
    };
    const update={
      $set: {EditorCNR: req.body.EditorCNR , EditorPaymentStatus: req.body.EditorPaymentStatus, editorPaymentDate: req.body.editorPaymentDate}
    };
    const result = await Customer.updateMany(query, update);
    console.log(`${result.matchedCount} documents matched the filter, updated ${result.modifiedCount} documents`);
    
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
    res.json({message: "Payroll Successfull"});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.put('/editorPayrollUpdateScript/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate()+1);
  try{
  let query={
    closingDate: {$gte: startDate, $lte: endDate},
    scriptWriter: tmName,
    scriptStatus: {$regex: /^Complete$/i}
  };
  const update={
    $set: {ScriptCNR: req.body.ScriptCNR, ScriptPaymentStatus: req.body.ScriptPaymentStatus, scriptPaymentDate: req.body.scriptPaymentDate}
  };
  const result = await Customer.updateMany(query, update);
  console.log(`${result.matchedCount} documents matched the filter, updated ${result.modifiedCount} documents`);
  
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
  res.json({message: "Payroll Successfull"});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.put('/editorPayrollUpdateVo/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate()+1);
  try{
  let query={
    closingDate: {$gte: startDate, $lte: endDate},
    voiceOver: tmName,
    voiceOverStatus: {$regex: /^Complete$/i}
  };
  const update={
    $set: {VoCNR: req.body.VoCNR, voiceOverPaymentDate: req.body.voiceOverPaymentDate, voiceOverPaymentStatus: req.body.voiceOverPaymentStatus}
  };
  const result = await Customer.updateMany(query, update);
  console.log(`${result.matchedCount} documents matched the filter, updated ${result.modifiedCount} documents`);
  
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
  res.json({message: "Payroll Successfull"});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.get('/editorPayroll', async(req,res)=>{
  try{
    const allData = await Payroll.find({
      tmName: person
    });
    if(allData.length> 0){
      res.json(allData);
    }else{
      res.json({result: "No Data Found"})
    }
  }catch(error){
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
});

router.get('/editorPayroll/:EditorCNR', async (req, res) => {
  console.log("ENTEr");
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

router.get('/scriptPayroll', async(req,res)=>{
  try{
    const allData = await Payroll.find({
      tmName: person
    });
    if(allData.length> 0){
      res.json(allData);
    }else{
      res.json({result: "No Data Found"})
    }
  }catch(error){
    console.error(error);
    res.status(500).json({message: "Server Error"});
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



router.get('/voPayroll', async(req,res)=>{
  try{
    const allData = await Payroll.find({
      tmName: person
    });
    if(allData.length> 0){
      res.json(allData);
    }else{
      res.json({result: "No Data Found"})
    }
  }catch(error){
    console.error(error);
    res.status(500).json({message: "Server Error"});
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

router.get('/dataByTmB2b/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try{
    let query = {
      b2bProjectDate: { $gte: startDate, $lte: endDate},
      b2bEditor: tmName 
    };
    const totalData = await B2bCustomer.find(query);
    res.json(totalData);
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.get('/dataByEditorPaymentB2b/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate() + 1);
  try{
    let query1={
      b2bProjectDate: {$gte: startDate, $lte: endDate},
      b2bEditor: tmName,
      projectStatus: { $regex: /^Completed$/i }
    };
    const completeProjects = await B2bCustomer.find(query1);
    let query2={
      b2bProjectDate: {$gte: startDate, $lte: endDate},
      b2bEditor: tmName,
      projectStatus: { $ne: 'Completed'}
    }
    const inCompleteProjects = await B2bCustomer.find(query2);
    let query3={
      b2bProjectDate: {$gte: startDate, $lte: endDate},
      b2bEditor: tmName,
      EditorPaymentStatus: {$ne: 'Transfered'},
      projectStatus: {$regex: /^Completed$/i}
    }
    const totalData= await B2bCustomer.find(query3);
    const paybalAmount = totalData.reduce((sum,doc)=> sum + doc.totalEditorPayment, 0);
    res.json({completeProjects, inCompleteProjects, paybalAmount});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.put('/editorPayrollUpdateB2b/:startDate/:endDate/:tmName', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  const tmName = req.params.tmName;
  endDate.setDate(endDate.getDate()+1);
  try{
    let query={
      b2bProjectDate: {$gte: startDate, $lte: endDate},
      b2bEditor: tmName,
      projectStatus: {$regex: /^Completed$/i}
    };
    const update={
      $set: {EditorCNR: req.body.EditorCNR , EditorPaymentStatus: req.body.EditorPaymentStatus, editorPaymentDate: req.body.editorPaymentDate}
    };
    const result = await B2bCustomer.updateMany(query, update);
    console.log(`${result.matchedCount} documents matched the filter, updated ${result.modifiedCount} documents`);
    
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
    res.json({message: "Payroll Successfull"});
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"})
  }
});

router.get('/allPayroll', async(req,res)=>{
  try{
    const allData = await Payroll.find();
    if(allData.length> 0){
      res.json(allData);
    }else{
      res.json({result: "No Data Found"})
    }
  }catch(error){
    console.error(error);
    res.status(500).json({message: "Server Error"});
  }
});

router.get('/payrollByDatePassRangeEditorAll/:startDate/:endDate', async (req, res) => {
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate() + 1);
  try {
    let query = {
      $or:[
        {editorPaymentDate: {
          $gte: startDate, $lte: endDate
        }},
        {scriptPaymentDate: {$gte: startDate, $lte: endDate}},
        {voiceOverPaymentDate: {$gte: startDate, $lte: endDate}}
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
  try{
    let query={
      $or:[
        { ScriptCNR: { $regex: req.params.EditorCNR } },
        { EditorCNR: { $regex: req.params.EditorCNR } },
        { VoCNR: { $regex: req.params.EditorCNR } },
      ]
    }
  let data = await Payroll.find(query);
  res.send(data);
  }catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"});
  }
});

module.exports = router
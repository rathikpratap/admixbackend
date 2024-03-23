const router = require('express').Router();

const User = require('./models/user');
const Customer = require('./models/newcustomer');
const ClosingCategory = require('./models/closingCategory');
const Lead = require('./models/Leads');
const salesLead = require('./models/salesLead');
const transferLead = require('./models/adminLeads');
const {Country, State, City} = require('country-state-city');
//const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const checkAuth = require('./middleware/chech-auth');
const axios = require('axios');
const multer = require('multer');
const XLSX = require('xlsx');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage});

let person = '';
let person1 = '';

router.post('/register', async (req, res) => {
  const user = new User({
    signupName: req.body.signupName,
    signupUsername: req.body.signupUsername,
    signupEmail: req.body.signupEmail,
    signupNumber: req.body.signupNumber,
    signupGender: req.body.signupGender,
    signupPassword: req.body.signupPassword,
    signupAddress: req.body.signupAddress,
    signupRole: req.body.signupRole
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
                  name: user.signupUsername
              };
              const token = jwt.sign(payload, "webBatch", { expiresIn: '1h' });
              //person = req.body.loginUsername;
              return res.json({ success: true, token: token, message: "Login Successful" });
          } else {
              return res.json({ success: false, message: "Password not Matched" });
          }
      })
      .catch(err => {
          res.json({ success: false, message: "Authentication Failed" });
      });
});

router.get('/profile', checkAuth, async (req,res)=>{
  const userId = await req.userData.userId;
  person = req.userData.name;
  
  User.findById(userId).exec().then((result)=>{
    console.log("data=====>>>>", person)
    return res.json({success: true, data:result})
  }).catch(err=>{
    res.json({success: false, message: "Server Error!!"})
  })
})

// Table Database Ongoing

router.get('/list', async (req, res) => {
  console.log("person hjjj ==>", person);
  const currentMonth = new Date().getMonth()+1;
  try {
      const products = await Customer.find({
          salesPerson: person,
          closingDate: {
            $gte: new Date(new Date().getFullYear(), currentMonth - 1,1),
            $lte: new Date(new Date().getFullYear(), currentMonth, 0)
          },
          //remainingAmount: { $gt: 0 },
          projectStatus: { $ne: 'Completed' }
      });

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
  const currentMonth = new Date().getMonth()+1;
  try {
      const completeProducts = await Customer.find({
          salesPerson: person,
          closingDate: {
            $gte: new Date(new Date().getFullYear(), currentMonth - 1,1),
            $lte: new Date(new Date().getFullYear(), currentMonth, 0)
          },
          //remainingAmount: 0,
          projectStatus: { $regex: /^Completed$/i }
      });

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

router.get('/allProjects', async(req,res)=>{
  const currentMonth = new Date().getMonth()+1;
  const allProjects = await Customer.find({
    salesPerson: person,
    closingDate: {
      $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
      $lte: new Date(new Date().getFullYear(), currentMonth, 0)
    }
  });
  return res.json(allProjects)
})

// All Projects Admin

router.get('/allProjectsAdmin', async (req, res)=>{
  const currentMonth = new Date().getMonth()+1;
  const allProjects = await Customer.find({
    closingDate: {
      $gte: new Date(new Date().getFullYear(), currentMonth - 1, 1),
      $lte: new Date(new Date().getFullYear(), currentMonth, 0)
    }
  });
  return res.json(allProjects)
})

//database Length

router.get('/dataLength', async (req, res)=>{
  const dataLength = await Customer.countDocuments();
  return res.json(dataLength);
});

// All Employees

router.get('/allEmployee', async (req, res)=>{
  const allEmployee = await User.find();
  if(allEmployee){
    return res.json(allEmployee)
  }else{
    res.send({result: "No Users Found"})
  }
})

//All Ongoing Projects

//router.get('/allOngoingProjects', async (req, res)=>{
//    const allOngoing = await Customer.find({ remainingAmount: {$gt: 0}});
//    if(allOngoing){
//        return res.json(allOngoing)
//    }else{
//        res.send({result: "No Data Found"})
//    }
//})

router.get('/allOngoingProjects', async (req, res) => {
  console.log("person ==>", person);
  const currentMonth = new Date().getMonth()+1;
  try {
      const products = await Customer.find({
          closingDate: {
            $gte: new Date(new Date().getFullYear(), currentMonth - 1,1),
            $lte: new Date(new Date().getFullYear(), currentMonth, 0)
          },
          //remainingAmount: { $gt: 0 },
          projectStatus: { $ne: 'Completed' }
      });

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
  const currentMonth = new Date().getMonth()+1;
  try {
      const completeProducts = await Customer.find({
          closingDate: {
            $gte: new Date(new Date().getFullYear(), currentMonth - 1,1),
            $lte: new Date(new Date().getFullYear(), currentMonth, 0)
          },
          //remainingAmount: 0,
          projectStatus: { $regex: /^Completed$/i }
      });

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

router.get('/read-cust/:id', async (req, res)=>{
  try {
      // Search in the Customer collection
      const customerDetails = await Customer.findById(req.params.id);
      
      // Search in other collections, for example, OtherCollection
      const otherDetails = await salesLead.findById(req.params.id);

      // Check if any data found in either collection
      if (customerDetails) {
          return res.json( customerDetails );
      } else if(otherDetails){
        return res.json(otherDetails);
      } else {
          return res.json({ result: "No Data" });
      }
  } catch (error) {
      return res.status(500).json({ error: error.message });
  }
});

//get Employee

router.get('/read-emp/:id', async(req, res)=>{
  try{
    const empDetails = await User.findById(req.params.id);
    if(empDetails) {
      console.log("Employee ==>",empDetails);
      return res.json(empDetails);
    } else{
      return res.json({result: "No Employee Found"});
    }
  } catch(error){
    return res.status(500).json({error: error.message});
  }
})

// delete Emp

router.delete('/delete-emp/:id', async(req, res)=>{
  try{
    const deleteData = await User.findByIdAndDelete(req.params.id);
    if(deleteData){
      console.log("Delete ==>", deleteData);
      return res.json(deleteData);
    }else{
      return res.json({result: "No Data Deleted"});
    }
  } catch(error){
    return res.status(500).json({error: error.message});
  }
})

// Delete Customers

router.delete('/delete-cust/:id', async(req, res)=>{
  try{
    const deleteCust = await Customer.findByIdAndDelete(req.params.id);
    if(deleteCust){
      return res.json(deleteCust);
    }else{
      return res.json({ result: "No Data Deleted"});
    }
  } catch(error){
    return res.status(500).json({error: error.message});
  }
})

// Edit Customer Details

//router.put('/update/:id', async (req,res)=>{
//  console.log("req.body ==>",req.body);
//  const custDet = await Customer.findByIdAndUpdate(req.params.id,{
//      $set: req.body
//  })
//  if(custDet){
//      return res.json(custDet)
//  }else{
//      res.send({result:"No No Data"})
//  }
//})

router.put('/update/:id', async(req, res)=>{
  try{
    let custDet = await Customer.findById(req.params.id);
    let leadDet = await salesLead.findById(req.params.id);
    if(custDet){
      custDet = await Customer.findByIdAndUpdate(req.params.id,{
        $set : req.body
      })
      return res.json(custDet)
    } else if( leadDet){
        if(req.body.projectStatus === 'Not Interested'){
          leadDet = await salesLead.findByIdAndUpdate(req.params.id,{
            $set : req.body
          })
          return res.json(leadDet)
        }else {
          const newCustomer = new Customer({
            _id: leadDet._id,
            custName: leadDet.custName,
            custNumb: leadDet.custNumb,
            custBussiness: leadDet.custBussiness,
            closingDate: leadDet.closingDate,
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
            salesPerson: leadDet.salesPerson
          });
          await newCustomer.save();
          await salesLead.findByIdAndDelete(req.params.id);
          return res.json(newCustomer);
        }
    }else{
      return res.json({ result: "No Data"});
    }
  } catch(error){
    return res.status(500).json({ error: error.message});
  }
});

// Edit Employee

router.put('/updateEmp/:id', async (req,res)=>{
  console.log("req.body ==>", req.body);
  const EmpDet = await User.findByIdAndUpdate(req.params.id,{
    $set: req.body
  })
  if(EmpDet){
    return res.json(EmpDet)
  }else{
    res.send({result: "No Employee Found"})
  }
})

//Search Data

router.get('/searchCustomer/:mobile', async (req,res)=>{
  let data = await Customer.find(
    {
      "$or": [
        { custNumb: {$regex: req.params.mobile}},
        { custName: {$regex: req.params.mobile}}
      ]
    }
  )
  res.send(data);
})

router.get('/customerProject/:projectStatus', async (req,res)=>{
  let data = await salesLead.find(
    {
      "$or": [
        { projectStatus: {$regex: req.params.projectStatus}}
      ]
    }
  )
  res.send(data);
})

// New Customer

router.post('/customer', async (req,res) => {
  const customer = new Customer({

    custCode : req.body.custCode,
    custName : req.body.custName,
    custNumb : req.body.custNumb,
    custBussiness : req.body.custBussiness,
    closingDate : req.body.closingDate,
    closingPrice : req.body.closingPrice,
    closingCateg : req.body.closingCateg,
    AdvPay : req.body.AdvPay,
    remainingAmount: req.body.remainingAmount,
    custCountry: req.body.custCountry,
    custCity : req.body.custCity,
    custState : req.body.custState,
    projectStatus : req.body.projectStatus,
    salesPerson : req.body.salesPerson,
    youtubeLink : req.body.youtubeLink,
    remark : req.body.remark

  })

  await customer.save()
  .then((_) => {
    res.json({success: true, message:"User Added!!"})
  })
  .catch((err) => {
    res.json({success: false, message: "User Not Added!!"})
  })
})

// Country State City

router.get('/countries', async (req, res)=>{
  try{
    const countries = Country.getAllCountries();
    res.json(countries);
  } catch(error){
    res.status(500).json({ message: 'Server Error'});
  }
});

router.get('/states/:countryCode', (req, res) => {
  const { countryCode } = req.params;
  const states = State.getStatesOfCountry(countryCode);
  console.log("State===>", states);
  res.json(states);
});

router.get('/cities/:countryCode/:stateCode', (req, res) => {
  const { countryCode} = req.params;
  const { stateCode } = req.params;
  const cities = City.getCitiesOfState(countryCode, stateCode);
  console.log("City===>", cities);
  res.json(cities);
});

//month-wise data

router.get('/totalEntries', async (req, res) => {
  
  const currentMonth = new Date().getMonth() + 1;
  console.log("Month person1 ==>", person);
  try {
    let query;
    if (person === 'Shiva Varshney') {
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

   const totalEntries = await Customer.find(query);
    const totalAmount = totalEntries.reduce((sum,doc)=> sum + doc.closingPrice, 0);
    const totalRecv = totalEntries.reduce((sum, doc)=> sum + doc.AdvPay, 0);
    const totalDue = totalEntries.reduce((sum,doc)=> sum + doc.remainingAmount, 0);
    res.json({totalEntries,totalAmount, totalRecv, totalDue});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});


// Current Day Entry

router.get('/todayEntries', async( req, res)=>{
  const currentDate = new Date();
  try{
    let query;
    if(person === 'Shiva Varshney'){
      query = {
        closingDate : {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
        }
      };
    } else{
      query = {
        salesPerson : person,
        closingDate : {
          $gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
          $lt: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1)
        }
      };
    }
    const totalDayEntry = await Customer.find(query);
    console.log("Total Entries===>>",totalDayEntry)
    res.json({totalDayEntry});
  } catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"});
  }
});

//Data By Date Range

router.get('/dataByRange/:startDate/:endDate', async(req, res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate()+1);
  try{
    let query;
    if(person === 'Shiva Varshney'){
      query ={
        closingDate : {
          $gte: startDate , $lte: endDate
        }
      };
    }else{
      query = {
        salesPerson : person,
        closingDate : {
          $gte: startDate , $lte: endDate
        }
      };
    }
    const rangeTotalData = await Customer.find(query);
    const rangeTotalAmount = rangeTotalData.reduce((sum, doc) => sum + doc.closingPrice, 0);
    const rangeTotalRecv = rangeTotalData.reduce((sum, doc)=> sum + doc.AdvPay, 0);
    const rangeTotalDue = rangeTotalData.reduce((sum, doc)=> sum + doc.remainingAmount, 0);
    res.json({rangeTotalData: rangeTotalData,
      rangeTotalAmount: rangeTotalAmount,
      rangeTotalRecv: rangeTotalRecv,
      rangeTotalDue: rangeTotalDue});
  } catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"});
  }
})

//Excel Upload

router.post('/uploadFile', upload.single('file'), async (req,res)=>{
  //await Customer.deleteMany();
  try{
    const workbook = XLSX.read(req.file.buffer, {type: 'buffer'});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    await Customer.insertMany(data);
    res.status(200).json({message: 'Data Upload Successfulll'});
  } catch(err) {
    console.error("Error Uploading File", err);
    res.status(500).json({ error: "Failed to Upload File"});
  }
})

//donwload Excel

router.get('/downloadFile', async( req, res)=>{
  const currentMonth = new Date().getMonth() + 1;
  console.log("person ==>", person);
  try{
    let query;
    if (person === 'Shiva Varshney') {
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
    const data = customers.map(customer =>({
      'custCode' : customer.custCode,
      'custName' : customer.custName,
      'custNumb' : customer.custNumb,
      'custBussiness' : customer.custBussiness,
      'closingDate' : customer.closingDate,
      'closingPrice' : customer.closingPrice,
      'closingCateg' : customer.closingCateg,
      'AdvPay' : customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'custCountry': customer.custCountry,
      'custCity' : customer.custCity,
      'custState' : customer.custState,
      'projectStatus' : customer.projectStatus,
      'salesPerson' : customer.salesPerson,
      'youtubeLink' : customer.youtubeLink,
      'remark' : customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch(err){
    console.error('Error Downloading File', err);
    res.status(500).json({error: 'Failed to download File'});
  }
});

router.get('/downloadRangeFile/:startDate/:endDate', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate()+1);
  try{
    let query;
    if(person === 'Shiva Varshney'){
      query ={
        closingDate : {
          $gte: startDate, $lte: endDate
        }
      };
    }else{
      query = {
        salesPerson : person,
        closingDate : {
          $gte: startDate , $lte: endDate
        }
      };
    }
    const rangeFileData = await Customer.find(query);
    const data = rangeFileData.map(customer => ({
      'custCode' : customer.custCode,
      'custName' : customer.custName,
      'custNumb' : customer.custNumb,
      'custBussiness' : customer.custBussiness,
      'closingDate' : customer.closingDate,
      'closingPrice' : customer.closingPrice,
      'closingCateg' : customer.closingCateg,
      'AdvPay' : customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'custCountry': customer.custCountry,
      'custCity' : customer.custCity,
      'custState' : customer.custState,
      'projectStatus' : customer.projectStatus,
      'salesPerson' : customer.salesPerson,
      'youtubeLink' : customer.youtubeLink,
      'remark' : customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch(err){
    console.error('Error Downloading File', err);
    res.status(500).json({error: 'Failed to download File'});
  }
  
});

// Download Due Data

router.get('/downloadDueFile/:startDate/:endDate', async(req,res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate()+1);
  try{
    let query;
    if(person === 'Shiva Varshney'){
      query ={
        closingDate : {
          $gte: startDate, $lte: endDate
        },
        remainingAmount :{ $gt: 0 } 
      };
    }else{
      query = {
        salesPerson : person,
        closingDate : {
          $gte: startDate , $lte: endDate
        },
        remainingAmount :{ $gt: 0 }
      };
    }
    const rangeFileData = await Customer.find(query);
    const data = rangeFileData.map(customer => ({
      'custCode' : customer.custCode,
      'custName' : customer.custName,
      'custNumb' : customer.custNumb,
      'custBussiness' : customer.custBussiness,
      'closingDate' : customer.closingDate,
      'closingPrice' : customer.closingPrice,
      'closingCateg' : customer.closingCateg,
      'AdvPay' : customer.AdvPay,
      'remainingAmount': customer.remainingAmount,
      'custCountry': customer.custCountry,
      'custCity' : customer.custCity,
      'custState' : customer.custState,
      'projectStatus' : customer.projectStatus,
      'salesPerson' : customer.salesPerson,
      'youtubeLink' : customer.youtubeLink,
      'remark' : customer.remark
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws, 'Customers');
    XLSX.writeFile(wb, 'customers.xlsx');
    res.download('customers.xlsx');
  } catch(err){
    console.error('Error Downloading File', err);
    res.status(500).json({error: 'Failed to download File'});
  }
  
});

// Add New Category

router.post('/newCategory', async(req, res)=>{
  try{
    const category = new ClosingCategory({
      categoryName : req.body.categoryName
    })
    await category.save().then((_)=>{
      res.json({success: true, message: "New Category Added"})
    }).catch((err)=>{
      if (err.code === 11000) {
        return res.json({success: false, message: "Category Already Added"})
      }
    });
  }catch(error){
    console.error('Error Adding Category', error);
    res.status(500).json({error: 'Failed to add Category'});
  }
});

// get Category

router.get('/getCategory', async(req, res)=>{
  try{
    const categories = await ClosingCategory.find();
    res.json(categories);
  }catch(error){
    console.error("Error Fetching Categories", error);
    res.status(500).json({error: 'Failed to Fetch Category Data '})
  }
});

// Facebook integration Api

const accessToken = 'EAANSY8Y9OkYBOyAtzy7KEsYlXahNipB3qwuB57NFQZBRzyzTiKxIslR0TdHK494kYGhr75bMCRU1xVAKbN4hSYZAPM414uuiUG74uFY4DOrq4QlhHvMMOOMcobJYwI3IVZBbzcROuqNkTaq3HkpuqddvpWT6xoD4xccOQct94FHg9qyAxatGJrt';

router.get('/facebook-leads', async (req, res) => {
  await Lead.deleteMany();
  try {
    
    const response = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id%2Cname%2Cadaccounts%7Bcampaigns%7Bid%2Cname%2Cads%7Bname%2Cleads%7D%7D%7D&access_token=${accessToken}`);
    const leadsData = response.data.adaccounts.data;
    let cust_name, company_name, phone, state, email ='';
    
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
                } else if(field.name === 'phone_number') {
                  phone = field.values[0];
                } else if(field.name === 'state') {
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
                salesperson: "" 
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

// get leads

router.get('/getFacebook-leads', async(req, res)=>{
  try{
    const fetchedLeads = await Lead.find();
    res.json(fetchedLeads);
  }catch(error){
    console.error("Error Fetching Leads", error);
    res.status(500).json({error: 'Failed to Fetch Leads'})
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
        existingItem.salesperson = item.salesperson;
        await existingItem.save();

        // Check if the item exists in the salesLead collection
        const salesLeadItem = await salesLead.findOne({ _id: existingItem._id });

        if (!salesLeadItem) {
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
            salesPerson: existingItem.salesperson
          };

          updatedItems.push(updatedItem);
        }
      }
    }

    // Insert updated items into the salesLead collection
    if (updatedItems.length > 0) {
      await salesLead.insertMany(updatedItems);
    }

    res.json({ message: "Items Updated Successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Leads Data by Range

router.get('/leadsByRange/:startDate/:endDate', async(req, res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate()+1);
  try{
    let query ={
      created_time : {
        $gte: startDate , $lte: endDate
      }
    };
    const rangeTotalData = await transferLead.find(query);
    console.log("Leads Data===>", rangeTotalData);
    res.json({rangeTotalData: rangeTotalData});
  } catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"});
  }
});

//Get Sales Leads

router.get('/getSales-leads', async(req, res)=>{
  try{
    const fetchedLeads = await salesLead.find({salesPerson: person});
    res.json(fetchedLeads);
  }catch(error){
    console.error("Error Fetching Leads", error);
    res.status(500).json({error: 'Failed to Fetch Leads'})
  }
});

// SalesLead by Range

router.get('/salesleadsByRange/:startDate/:endDate', async(req, res)=>{
  const startDate = new Date(req.params.startDate);
  const endDate = new Date(req.params.endDate);
  endDate.setDate(endDate.getDate()+1);
  try{
    let query ={
      closingDate : {
        $gte: startDate , $lte: endDate
      }
    };
    const rangeTotalData = await salesLead.find(query);
    console.log("Leads Data===>", rangeTotalData);
    res.json({rangeTotalData: rangeTotalData});
  } catch(error){
    console.log(error);
    res.status(500).json({message: "Server Error"});
  }
});

//transfer Admin Leads

router.get('/transferLeads', async(req, res)=>{
  try{
    const fbLead = await Lead.find();
    let successCount=0;
    let skipCount=0;
    for( doc of fbLead){

      let existingLead = await transferLead.findOne({created_time: doc.created_time});

      if(!existingLead){
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
          salesperson: doc.salesperson
        })
        await adminLead.save();
        successCount++;
      }else{
        skipCount++;
      }
    }
    res.status(200).json({ success: true, message: "Data Transfer Successful", successCount: successCount, skipCount: skipCount });
  }catch(error){
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

//get All Admin Leads
router.get('/getAdmin-leads', async(req, res)=>{
  try{
    const fetchedLeads = await transferLead.find();
    res.json(fetchedLeads);
  }catch(error){
    console.error("Error Fetching Leads", error);
    res.status(500).json({error: 'Failed to Fetch Leads'})
  }
});

module.exports = router
const router = require('express').Router();

const User = require('./models/user');
const Customer = require('./models/newcustomer');
const ClosingCategory = require('./models/closingCategory');
const Lead = require('./models/Leads');
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
                  userId: user._id
              };
              const token = jwt.sign(payload, "webBatch", { expiresIn: '1h' });
              person = req.body.loginUsername;
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
  
  User.findById(userId).exec().then((result)=>{
    return res.json({success: true, data:result})
  }).catch(err=>{
    res.json({success: false, message: "Server Error!!"})
  })
})

// Table Database Ongoing

router.get('/list', async (req, res) => {
  console.log("person ==>", person);
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

router.get('/read-cust/:id', async (req, res)=>{
    try {
        const details = await Customer.findById(req.params.id);
        if (details) {
            return res.json(details);
        } else {
            return res.json({ result: "No Data" });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

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

router.put('/update/:id', async (req,res)=>{
  console.log("req.body ==>",req.body);
  const custDet = await Customer.findByIdAndUpdate(req.params.id,{
      $set: req.body
  })
  if(custDet){
      return res.json(custDet)
  }else{
      res.send({result:"No No Data"})
  }
})

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
  console.log("person ==>", person);
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

const accessToken = 'EAAWYGC5I1ZCMBOZCHJ1ZAullgKhNPY2ZBOYvxKZAXKNclVH4u5tAsb1dEhE4NCq1EEzszPLNg3KqHC4a565AANqH7ltCHXiVC6E8JdN1Pcts0nD97oPD85HNwblUAMZBUFZC2lC6kJVR25ZAeDg7baj25ike0lcs9HYELWfiYGC8f5ZCypc2h2M2m9PX5';

router.get('/facebook-leads', async (req, res) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v19.0/me?fields=adaccounts%7Bid%2Ccampaigns%7Bid%2Cname%2Cads%7Bname%2Cleads%7D%7D%7D&access_token=${accessToken}`);
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
                state: state 
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

//router.put('/getFacebook-leads/:id', async(req, res)=>{
//  try{
//    const {id} = req.params;
//    const { salesperson } = req.body;
//    await Lead.findByIdAndUpdate(id,{salesperson});
//    await
//  }
//})

module.exports = router
const router = require('express').Router();

const User = require('./models/user');
const Customer = require('./models/newcustomer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const checkAuth = require('./middleware/chech-auth');

let person = '';

router.post('/register', async (req, res) => {
  bcrypt.hash(req.body.signupPassword, 10, async (err, hash) => {
    if (err) {
      return res.json({ success: false, message: "Hash Error!!" })
    } else {
      const user = new User({
        signupName: req.body.signupName,
        signupUsername: req.body.signupUsername,
        signupEmail: req.body.signupEmail,
        signupNumber: req.body.signupNumber,
        signupGender: req.body.signupGender,
        signupPassword: hash,
        signupAddress: req.body.signupAddress
      })

      await user.save()
        .then((_) => {
          res.json({ success: true, message: "Account has been created!!" })
        })
        .catch((err) => {
          if (err.code === 11000) {
            return res.json({ success: false, message: err })
          }
          res.json({ success: false, message: "Authentication Failed" })
        })
    }});
  }
)

// Login Bellow 

router.post('/login',(req, res) =>{
  User.find({signupUsername:req.body.loginUsername}).exec().then((result)=>{
    if(result.length < 1){
      return res.json({ success: false, message: "User not found!!"})
    }
    const user = result[0];
    bcrypt.compare(req.body.loginPswd, user.signupPassword, (err, ret)=>{
      if(ret){
        const payload ={
          userId: user._id
        }
        const token = jwt.sign(payload, "webBatch", {expiresIn: '1h'})
        person = req.body.loginUsername;
        return res.json({success: true, token:token, message: "Login Successful"})
        
      }else{
        return res.json({success:false, message: "Password not Matched"})
      }
    })
  }).catch(err => {
    res.json({success: false, message: "Authentication Failed"})
  })
})

router.get('/profile', checkAuth, async (req,res)=>{
  const userId = await req.userData.userId;
  
  User.findById(userId).exec().then((result)=>{
    return res.json({success: true, data:result})
  }).catch(err=>{
    res.json({success: false, message: "Server Error!!"})
  })
})

// Table Database Ongoing

router.get('/list',async (req,res)=>{
    console.log("person ==>",person);
    const products = await Customer.find({ 
        $and: [
             { salesPerson: person },
            //{ remainingAmount: { $gt: 0 } },
            { projectStatus : { $not: { $regex : /^Completed$/i}}}
        ]
    });
    if(products) {
        return res.json(products)
    }else{
        res.send({result: "No Data Found"})
    }
})

// Table Database Closed

router.get('/completeProject',async (req, res)=>{
    const completeProducts = await Customer.find({
        $and: [
            { salesPerson: person },
            { remainingAmount: { $eq : 0}},
            { projectStatus : { $regex: /^Completed$/i }}
        ]
    });
    if(completeProducts){
        return res.json(completeProducts)
    }else{
        res.send({result: "No Data Found"})
    }
})

// All Sales Person Project

router.get('/allProjects', async (req, res)=>{
  const allProjects = await Customer.find({ salesPerson: person});
  if(allProjects){
    return res.json(allProjects)
  }else{
    res.send({result: "No Data Found"})
  }
})

// All Projects Admin

router.get('/allProjectsAdmin', async (req, res)=>{
  const allProjectsAdmin = await Customer.find();
  if(allProjectsAdmin){
    return res.json(allProjectsAdmin)
  }else{
    res.send({result: "No Data Found"})
  }
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

router.get('/allOngoingProjects', async (req, res)=>{
    const allOngoing = await Customer.find({ remainingAmount: {$gt: 0}});
    if(allOngoing){
        return res.json(allOngoing)
    }else{
        res.send({result: "No Data Found"})
    }
})

//All Complete projects

router.get('/allCompleteProjects', async (req, res)=>{
    const allComplete = await Customer.find({ remainingAmount :{$eq: 0} });
    if(allComplete){
        return res.json(allComplete)
    }else{
        res.send({result: "No Data Found"})
    }
})

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

//Search Data

router.get('/searchCustomer/:mobile', async (req,res)=>{
  let data = await Customer.find(
    {
      "$or": [
        { custNumb: {$regex: req.params.mobile}}
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
    custCity : req.body.custCity,
    custState : req.body.custState,
    projectStatus : req.body.projectStatus,
    salesPerson : req.body.salesPerson,
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

module.exports = router
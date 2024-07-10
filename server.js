const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
var morgan = require('morgan')
const nodemailer = require("nodemailer");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const stripe = require('stripe')('sk_test_51POLSORr2k4AYrtAMTYxJpf3cZ55y7E23oRnHNAVtT96O28obBtB6zPA9ts8O7fdum9qIlw733YqhLuUbG6tNh7B008htkEosZ');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(morgan());
app.use(express.static("./public"));

// 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public');
  },
  filename: function (req, file, cb) {
    try{if(req.body.email){
    // Access the email from the request body
    const email = req.body.email;
    // Ensure that email is available
    if (email) {
      // Extract the file extension from the original file name
      const fileExtension = path.extname(file.originalname);
      // Construct the file name using the email and file extension
      const fileName = email + fileExtension;
      // Set the file name
      cb(null, fileName);
    }}
    else{
      console.log("Please!");
      const fileExtension = path.extname(file.originalname);
      const filename="doc-"+req.body.filename+".pdf";
      cb(null, filename);
    }
  }
   
  catch(e){
    console.log(e);
  }}}
);



const upload = multer({ storage: storage })

app.post('/api/profile',upload.single('file'),async (req,res)=>{
  try {
   if(!req.body.email) {
    res.status(500).json({ error: 'Uplaoding Mechanism got error!' });
    return;
   }
   res.status(200).json({message:"Successfully Uploaded !"});
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
})


const documentInfoSchema = new mongoose.Schema({
  filename: {  type: String,   required: true  },
  sentBy: {type: String,required: true },
  dated: {type: Date,required: true },
  reason: { type: String, required: true },
  path: { type: String, required: true }
});

const DocumentInfo = mongoose.model('DocumentInfo', documentInfoSchema);

app.post('/api/document',upload.single('file'),async (req,res)=>{
  try {
   const data = {
    filename: req.body.filename,
    sentBy: req.body.sentBy,
    dated: req.body.dated,
    reason: req.body.reason,
    path : "doc-"+req.body.filename+".pdf",
   } 
   const documentInfo = new DocumentInfo(data);
   await documentInfo.save();
   res.status(200).json({message:"Successfully Uploaded !"});
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
})

app.get("/api/documents",async(req,res)=>{
  try {
    const documents = await DocumentInfo.find();
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
})

mongoose.connect('mongodb+srv://signup:signup123@signup.huufj5v.mongodb.net/?retryWrites=true&w=majority&appName=signup', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

  
const transport = nodemailer.createTransport({
  service: "Outlook",
  auth: {
    user: 'abidipro01@outlook.com',
    pass: 'vpwjxxgcmysinphh'
  }
})

// Api to send Mail Regarding Timeoff Approval
app.get("/api/timeoff/mail",(req,res)=>{
  let personalInfo = req.query;
  // {
  //   id:index,
  //   reason:reason,
  //   off_date:off_date,
  //   end_date:end_date
  //  }
  let mailOptions = {
    from: 'abidipro01@outlook.com',
    to: `${personalInfo.email}`,
    subject: 'TimeOff Request Approved (Abidi-Pro Solution!)',
    html: `<div class="container">
    <img src="https://abidisolutions.com/wp-content/uploads/2023/09/Official-Abidi-Solutions-website-logo-01.png" height="90" width="170" style="vertical-align: middle;"/>
    <p style="marginTop:3px;">Welcome to AbidiPro, your timeoff request for ${personalInfo.reason} is aprroved by the company.</p>
   
    <b>Timeoff Duration</b>
    <ul>
        <li>From: ${personalInfo.off_date.slice(0,10)}</li>
        <li>To: ${personalInfo.end_date.slice(0,10)}</li>
    </ul>
  </div>`
  }
  transport.sendMail(mailOptions,function(err,info){
    if(err){
      console.log(err);
    }else{
      console.log("Email Sent"+info.response);
    }
  })

})

// Api to send Welcome Mail

app.get("/api/createUser/mail",(req,res)=>{
  let personalEmail = req.query.personalEmail;
  let email = req.query.email;
  let password = req.query.password;
  console.log(email);
  let mailOptions = {
    from: 'abidipro01@outlook.com',
    to: `${personalEmail}`,
    subject: 'Welcome to Abidi-Pro Solution!',
    html: `<div class="container">
    <span style="display: inline-block;">
    <img src="https://abidisolutions.com/wp-content/uploads/2023/09/Official-Abidi-Solutions-website-logo-01.png" height="90" width="170" style="vertical-align: middle;"/>
    <h1 style="display: inline; margin: 0; vertical-align: middle;">Welcome to Abidi-Pro Solution!</h1>
    </span>
    <p>Welcome to AbidiPro, your comprehensive HR management solution designed to streamline your organization's human resource processes and empower your workforce.</p>
    <p>We're excited to have you on board with us at AbidiPro. Our team is dedicated to providing you with exceptional support and helping you make the most of our platform to achieve your goals.</p>
    <p>Your Credentials :</p>
    <ul>
        <li>Email: ${email}</li>
        <li>Password: ${password}</li>
    </ul>
    <p>Get started today and experience the power of Abidi-Pro!</p>
  </div>`
  }
  transport.sendMail(mailOptions,function(err,info){
    if(err){
      console.log(err);
    }else{
      console.log("Email Sent"+info.response);
    }
  })

})

app.get("/api/task/mail",(req,res)=>{
  let personalEmail = req.query.personalEmail;
  let mailOptions = {
    from: 'abidipro01@outlook.com',
    to: `${personalEmail}`,
    subject: 'Task Assigned in Abidi-Pro!',
    html: `<div class="container">
    <span style="display: inline-block;">
    <img src="https://abidisolutions.com/wp-content/uploads/2023/09/Official-Abidi-Solutions-website-logo-01.png" height="90" width="170" style="vertical-align: middle;"/>
    <h1 style="display: inline; margin: 0; vertical-align: middle;">Welcome to Abidi-Pro Solution!</h1>
    </span>
    <p>Task Assigned to you by <b>${req.query.assignedBy}</b> </p>
    <p>Your Credentials :</p>
    <ul>
        <li>Project Name: ${req.query.projectName}</li>
        <li>Task Description: ${req.query.textDescription}</li>
        <li>Start Date: ${req.query.startDate}</li>
        <li>End Datae: ${req.query.endDate}</li>
    </ul>
    <p>Get started today through Abdid-Pro!</p>
  </div>`
  }
  transport.sendMail(mailOptions,function(err,info){
    if(err){
      console.log(err);
    }else{
      console.log("Email Sent"+info.response);
    }
  })
  res.status(200).json({messgae:"email sent!"})
})

app.get("/api/timeoff/notify-manager", (req, res) => {
  let managerEmail = req.query.managerEmail;
  let employeeName = req.query.employeeName;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let reason = req.query.reason;

  let mailOptions = {
    from: 'abidipro01@outlook.com',
    to: `${managerEmail}`,
    subject: 'Time-Off Request from Employee',
    html: `
    <div class="container">
      <span style="display: inline-block;">
        <img src="https://abidisolutions.com/wp-content/uploads/2023/09/Official-Abidi-Solutions-website-logo-01.png" height="90" width="170" style="vertical-align: middle;"/>
        <h1 style="display: inline; margin: 0; vertical-align: middle;">Abidi-Pro Solution: Time-Off Request</h1>
      </span>
      <p>Dear Manager,</p>
      <p>A time-off request has been submitted by one of your team members.</p>
      <p>Request Details:</p>
      <ul>
        <li>Employee Name: <b>${employeeName}</b></li>
        <li>Start Date: ${startDate}</li>
        <li>End Date: ${endDate}</li>
        <li>Reason: ${reason}</li>
      </ul>
      <p>Please review this request and take appropriate action through the Abidi-Pro system.</p>
      <p>Thank you for your attention to this matter.</p>
    </div>`
  }

  transport.sendMail(mailOptions, function(err, info) {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error sending email", error: err });
    } else {
      console.log("Email Sent: " + info.response);
      res.status(200).json({ message: "Notification email sent to manager" });
    }
  })
})


 ///////////////////////////// TIME OFF  SCHEMA  //////////////////////////////////////////////////////////////////////////////////


const timeOffSchema = new mongoose.Schema({
  Type_of_Time_Off: String,
  Reason_for_Time_Off: String,
  To: Date,
  From: Date,
  Name: { type: String, required: true},
  Email: { type: String, required: true},
  Approved: { type: Boolean, default: false },
});

const TimeOff = mongoose.model('TimeOff', timeOffSchema);


 ///////////////////////////// VIEW INVOICES  SCHEMA  //////////////////////////////////////////////////////////////////////////////////


const viewInvoiceSchema = new mongoose.Schema({
  ItemizedServices_Products: { type: String, required: true },
  Amounts: { type: String, required: true },
  Due_Date: { type: String, required: true }, // Assuming this should be a string to match your frontend code
});

const viewInvoice = mongoose.model('ViewInvoice', viewInvoiceSchema);



      ///////////////////////////// Payment STATUS  SCHEMA  //////////////////////////////////////////////////////////////////////////////////



  const paymentStatusSchema = new mongoose.Schema({
    Payment_Date: { type: Date, required: true },
    Payment_Method: { type: String, required: true },
    Amount_paid: { type: Number, required: true },
  });
  
  const PaymentStatus = mongoose.model('PaymentStatus', paymentStatusSchema);
  


    ///////////////////////////// CREATE INVOICE  SCHEMA  //////////////////////////////////////////////////////////////////////////////////



  const createInvoiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    salary: { type: String, required: true },
    reportingmanager: { type: String, required: true },
    invoicedate: { type: Date, required: true },
  });
  
  const Invoice = mongoose.model('Create-Invoice', createInvoiceSchema);
  
  const invoiceSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    companyAddress: { type: String, required: true },
    companyPhone: { type: String, required: true },
    companyEmail: { type: String, required: true },
    companyWebsite: { type: String, required: true },
    companyTin: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    bankid: { type: String, required: true },
    paymentTerms: { type: String, required: true },
    clientName: { type: String, required: true },
    clientCompany: { type: String, required: true },
    clientAddress: { type: String, required: true },
    clientPhone: { type: String, required: true },
    clientEmail: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number,default:0 },
    date: { type: Date, required: true, default: Date.now } 
  });
  
  const InvoiceForm = mongoose.model('Invoice', invoiceSchema);

  ///////////////////////////// ASSIGNED TASK SCHEMA  //////////////////////////////////////////////////////////////////////////////////

// create and assigned task schema 
  const assignedTaskSchema = new mongoose.Schema({
    projectName: { type: String, required: true },
    taskName: { type: String, required: true },
    assignedTo: { type: String, required: true },
    assignedBy: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    textDescription: { type: String, required: true },
    taskStatus: String,
  });
  
  const createTask = mongoose.model('Assigned Task', assignedTaskSchema);




///////////////////// Time schema ///////////////////

const timeEntrySchema = new mongoose.Schema({
  date: String,
  day: String,  
  checkIn: String,
  checkOut: String,
  totalTime: String,
  email: String
},{timestamps:true})

const TimeEntry = mongoose.model('Time Entry', timeEntrySchema);
app.post('/api/timeEntries', async (req, res) => {
  try {
    // Extract necessary fields from request body
    const { date, email } = req.body;

    // Check if there's already an entry for the given date and user's email
    const existingEntry = await TimeEntry.findOne({ date, email }).sort({ createdAt: -1 });

    // If an entry exists for the given date and email, return an error
    if (existingEntry) {
      return res.status(400).send({ error: 'A time entry for this date already exists.' });
    }

    // If no entry exists for the given date and email, proceed to create a new entry
    const timeEntry = new TimeEntry(req.body);
    await timeEntry.save();
    res.status(201).send(timeEntry);
  } catch (error) {
    res.status(500).send({ error: 'Internal server error' });
  }
});


app.get('/api/timeEntries', async (req, res) => {
  try {
    const timeEntries = await TimeEntry.find({email: req.query.email}).sort({date:-1,checkOut:-1}).limit(10);
    res.status(200).send(timeEntries);
  } catch (error) {
    res.status(500).send(error);
  }
});


///////////////////////////// TASK STATUS SCHEMA //////////////////////////////////////////////////////////////////////////////////


  // Define a Task schema and model
const taskAssignSchema = new mongoose.Schema({
  name: String,
  taskAssinge: String,
  completionTime: String,
  date: Date,
  taskpriority: String, // For example, "In Progress", "Completed"
});

const Task = mongoose.model('Task', taskAssignSchema);


  ////////////////////////////////////////////// Payroll Emplyoee Schema //////////////////////////////////////////////////////

  const EmployeePayrollSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    employeeName: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    designation: {
        type: String,
        required: true
    },
    joiningDate: {
        type: Date,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    basicSalary: {
        type: Number,
        required: true
    },
    houseAllowance: {
        type: Number,
        required: true
    },
    transportAllowance: {
        type: Number,
        required: true
    },
    otherAllowances: {
        type: Number,
        required: true
    },
    deductions: {
        type: Number,
        required: true
    },
    netSalary: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const EmployeePayroll = mongoose.model('EmployeePayroll', EmployeePayrollSchema);

///////////////////////////// USER API SCHEMA //////////////////////////////////////////////////////////////////////////////////


// USER schema create user
const userSchema = new mongoose.Schema({   email: { type: String, required: true, unique: true }, 
  password: { type: String, required: true }, // Ensure hashing in actual implementation
name: String,  
 officeId: String,  
  linkedinId: String,
     designation: String, 
       city: String, 
         phoneNumber: String,  
          birthday: Date, 
            status: String, 
            reportTo: String, 
             personalEmail: String,  
              gender: String, 
                image: String, // Path to the image or URL 
                  resume: String, // Path to the resume or URL 
                    street: String, 
                      state: String,  
                       country: String,  
                        twitter: String, 
                          facebook: String, }); 
                          const User = mongoose.model('User', userSchema);






  // create project schema 
  const projectSchema = new mongoose.Schema({
    projectName: { type: String, required: true, unique: true },
    lead: { type: String, required: true },
    assignedMembers: [{ type: String }],
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  });
  
  const Project = mongoose.model('Project', projectSchema);





///////////////////////////// Sign Up data USER //////////////////////////////////////////////////////////////////////////////////


 
  
  // User registration
  app.post('/api/users/signup', async (req, res) => {
    try {
      const { email, password } = req.body;
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).send('User already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ email, password: hashedPassword });
      await user.save();
      res.status(201).send('User registered successfully');
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
  



  /////////////////////////////////////////// USER LOGIN //////////////////////////////////////////////////////////////////////////////////

  // User login
  app.post('/api/users/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
      res.json({ message: 'Login successful', userId: user._id,email:user.email, designation: user.designation,name: user.name});
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  ////////////////////////////////////////// PERSONAL DETAIL UPDATE //////////////////////////////////////////////////////////////////////////////////

  
  // Update personal information
  app.post('/api/users/updatePersonalInfo', async (req, res) => {
    try {
      const { userId, name, officeId, linkedinId, designation, city, phoneNumber, birthday } = req.body;
      let user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      user.name = name || user.name;
      user.officeId = officeId || user.officeId;
      user.linkedinId = linkedinId || user.linkedinId;
      user.designation = designation || user.designation;
      user.city = city || user.city;
      user.phoneNumber = phoneNumber || user.phoneNumber;
      user.birthday = birthday || user.birthday;
      user.status = status || user.status;
      user.reportTo = reportTo || user.reportTo;
      user.personalEmail = personalEmail || user.personalEmail;// Add this line to update the status

  
      // Save personal info along with the user's email and id
      user = await user.save();
  
      res.status(200).json({ message: 'Personal information updated successfully', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  //////////////////////////////////////////////// FETCH USER BY ID //////////////////////////////////////////////////////////////////////////////////

  // Fetch user by ID
  app.get('/api/users/user/:userId', async (req, res) => {
      try {
          const userId = req.params.userId;
          const user = await User.findById(userId);
          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }
          console.log(user);
          res.json(user);
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
  });

    // Fetch user by email
    app.get('/api/users/findByEmail', async (req, res) => {
      try {
          const userEmail = req.query.email;
          const user = await User.findOne({email: userEmail});
          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }
          console.log(user);
          res.json(user);
      } catch (error) {
          res.status(500).json({ error: error.message });
      }
  });


  // Fetch user by Name
  app.get('/api/users/userName', async (req, res) => {
    try {
      const userName = req.query.userName;
      const user = await User.findOne({ name: userName });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log(user);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  
  //////////////////////////////////////// CREATE USER SAVING AND SENDING DATA TO MONGODB //////////////////////////////////////////////////////////////////////////////////

  app.post('/api/users/create-user', async (req, res) => {
    try {
      // Destructuring all fields from the request body
      const { 
        email, 
        password, 
        name, 
        officeId, 
        linkedinId, 
        designation, 
        city, 
        phoneNumber, 
        birthday ,
        status,
        reportTo,
        personalEmail,

      } = req.body;
  
      // Check if the user already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).send('User already exists');
      }
  
      // Hash the password before saving it to the database
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create a new user with all the provided fields
      user = new User({
        email,
        password: hashedPassword, // Make sure to never save plain text passwords
        name,
        officeId,
        linkedinId,
        designation,
        city,
        phoneNumber,
        birthday: birthday ? new Date(birthday) : null, // Ensure birthday is converted to a Date object if provided
        status, 
        reportTo,
        personalEmail,// Add this line

      });
  
      // Save the user to the database
      await user.save();
  
      // Respond with success message
      res.status(201).send('User registered successfully');
    } catch (error) {
      // If there's an error, respond with a server error status code and the error message
      res.status(500).send(error.message);
    }
  });
  
  app.get("/api/getName",async (req,res)=>{
    try {
      const user = await User.find({email:req.query.email});
      res.json(user[0].name);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })

  app.get("/api/getUser",async (req,res)=>{
    try {
      const users = await User.find({},{personalEmail:1,name:1,status:1,reportTo:1,designation:1,_id:0,id:"$_id"});
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })
  
  app.delete("/api/deleteUser",async (req,res)=>{
   
    try {
      const users = await User.findOneAndDelete({_id:req.query.id});
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })

  app.put("/api/updateUser",async (req,res)=>{
   try {
      const users = await User.findOneAndUpdate({_id:req.body._id},req.body);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }                            
})
  

///////////////////////////////////// Create project schema //////////////////////////////////////////////////////////////////////////////////


  // Create a new project
  app.post('/api/projects', async (req, res) => {
    try {
      const { projectName, lead, assignedMembers, startDate, endDate } = req.body;
  
      const project = new Project({
        projectName,
        lead,
        assignedMembers,
        startDate,
        endDate,
      });
  
      await project.save();
  
      res.status(201).json({ message: 'Project created successfully', project });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /// GET PROJECTS CREATED BY CURRENT USER
  app.get('/api/project/created', async (req, res) => {
    try {
      // Select only the 'name' field from each document in the 'User' collection
      const users = await Project.find({lead: { $regex:new RegExp(req.query.name, 'i')}}); // '-_id' excludes the '_id' field from the results
      // Extract names from the user documents
      // res.status(200).json(users.map(p => [p._id,p.projectName,p.lead,p.assignedMembers,p.startDate,p.endDate]));
      console.log(users);
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update a project
  app.put('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { projectName, lead, assignedMembers, startDate, endDate } = req.body;
  
      const project = await Project.findByIdAndUpdate(
        id,
        { projectName, lead, assignedMembers, startDate, endDate },
        { new: true }
      );
  
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
  
      res.json({ message: 'Project updated successfully', project });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Fetch all projects
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await Project.find(); // Fetch all projects from the database
      res.json(projects); // Send them back to the client
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });



 ///////////////////// Employee to Payroll //////////////////////

 app.post("/api/addEmploy", async (req, res) => {
  try{
    console.log(req.body);
    const employee = new EmployeePayroll(req.body);
    await employee.save();
    res.status(201).send({ message: "Employee added successfully", employee });
  }catch(err){
    res.status(500).json({ error: err.message });
  }
 })

 app.get("/api/EmployeesPayroll",async (req, res) => {
  try{
    const employees = await EmployeePayroll.find({});
    console.log(employees);
    res.status(201).send(employees);
  }catch(err){
    res.status(500).json({ error: err.message });
  }
 })



///////////////////////////// taskstatus api //////////////////////////////////////////////////////////////////////////////////

  // API to create a new task
app.post('/api/assigned-tasks', async (req, res) => {
  const task = new Task({
    ...req.body
  });
  
  try {
    await task.save();
    res.status(201).send({ message: "Task created successfully", task });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// API to get all tasks
app.get('/api/assigned-tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.status(200).send(tasks);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// API to update a task
app.put('/api/assigned-tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!task) {
      return res.status(404).send('The task with the given ID was not found.');
    }
    res.send(task);
  } catch (error) {
    res.status(400).send(error.message);
  }
});
  

///////////////////////////// ASSIGNED api //////////////////////////////////////////////////////////////////////////////////


// POST endpoint to create a new task
app.post('/api/create-tasks', async (req, res) => {
  try {
    const task = new createTask({
      projectName: req.body.projectName,
      taskName:  req.body.taskName,
      assignedTo:  req.body.assignedTo,
      assignedBy:  req.body.assignedBy,
      startDate : req.body.startDate,
      endDate : req.body.endDate,
      textDescription : req.body.textDescription,
    });
    await task.save();
    res.status(201).send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.put("/api/updateStatus",async (req, res) => {
  try {
    const tasks = await createTask.findOneAndUpdate({_id:req.body.id},{taskStatus:req.body.taskStatus},{new:true});
    console.log(tasks);
    res.send(tasks);
  } catch (error) {
    console.error(error); // Log the error to the console

    res.status(500).send();
  }
})

// GET endpoint to fetch all tasks
app.get('/api/create-tasks', async (req, res) => {
  try {
    const tasks = await createTask.find({assignedBy:{$regex: new RegExp(req.query.name,"i")}});
    res.send(tasks);
  } catch (error) {
    console.error(error); // Log the error to the console

    res.status(500).send();
  }
});

app.get('/api/my-tasks', async (req, res) => {
  try {
    const tasks = await createTask.find({assignedTo:{$regex: new RegExp(req.query.name,"i")}});
    res.send(tasks);
  } catch (error) {
    console.error(error); // Log the error to the console

    res.status(500).send();
  }
});

// PATCH endpoint to update a task
app.patch('/api/create-tasks/update', async (req, res) => {
  try {
    const task = await createTask.findByIdAndUpdate(req.body._id, req.body, { new: true, runValidators: true });
    if (!task) {
      return res.status(404).send();
    }
    res.send(task);
  } catch (error) {
    res.status(400).send(error);
  }
});



///////////////////////////// CREATE INVOICE API STRCUTURE //////////////////////////////////////////////////////////////////////////////////




app.post('/api/create-invoices', async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    res.status(201).send({ message: "Invoice created successfully", invoice });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get('/api/create-invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find({});
    res.status(200).send(invoices);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


app.put('/api/create-invoices/:id', async (req, res) => {
  const updates = Object.keys(req.body);
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).send({ message: "Invoice not found" });
    }
    updates.forEach((update) => invoice[update] = req.body[update]);
    await invoice.save();
    res.send({ message: "Invoice updated successfully", invoice });
  } catch (error) {
    res.status(400).send(error);
  }
});

 
///////////////////////////// PAYMENT STATUS API STRCUTURE //////////////////////////////////////////////////////////////////////////////////

app.post('/api/payment-status', async (req, res) => {
  try {
    const paymentStatus = new PaymentStatus(req.body);
    await paymentStatus.save();
    res.status(201).json({ message: 'Payment status saved successfully', paymentStatus });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});



app.get('/api/payment-status', async (req, res) => {
  try {
    const paymentStatuses = await PaymentStatus.find({});
    res.status(200).json(paymentStatuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.put('/api/payment-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const paymentStatus = await PaymentStatus.findByIdAndUpdate(id, req.body, { new: true });
    if (!paymentStatus) {
      return res.status(404).json({ error: 'Payment status not found' });
    }
    res.json({ message: 'Payment status updated successfully', paymentStatus });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});





///////////////////////////// VIEW INVOICES API STRCUTURE //////////////////////////////////////////////////////////////////////////////////

app.post('/api/view-invoices', async (req, res) => {
  try {
    const invoice = new viewInvoice(req.body);
    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/view-invoices', async (req, res) => {
  try {
    const invoices = await InvoiceForm.find({}).sort({date:-1});
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get('/api/viewOne-invoices', async (req, res) => {
  try {
    const invoices = await InvoiceForm.find({_id: req.query._id});
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/view-invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await viewInvoice.findByIdAndUpdate(id, req.body, { new: true });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//////////////////////////////// Get all Users Names /////////////////////////////////////////////////////

app.get('/api/users/names', async (req, res) => {
  try {
    // Select only the 'name' field from each document in the 'User' collection
    const users = await User.find().select('name -_id').sort({name:1}); // '-_id' excludes the '_id' field from the results
    // Extract names from the user documents
    const names = users.map(user => `${user.name[0].toUpperCase()}${user.name.slice(1)}`);
    res.status(200).json(names);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




/////////////////////////////////////////////////////////////////////////////////////////////////////////Account page api ////////////////////

// Update user account details
app.put('/api/users/updateAccount', async (req, res) => {
  const { userId, name, personalEmail, phoneNumber, gender, birthday, street, city, state, country, linkedinId, twitter, facebook, designation, image, resume } = req.body;

  try {
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Updating fields if they are provided in the request
      if (name) user.name = name;
      if (personalEmail) user.personalEmail = personalEmail;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (gender) user.gender = gender;
      if (birthday) user.birthday = birthday;
      if (street) user.street = street;
      if (city) user.city = city;
      if (state) user.state = state;
      if (country) user.country = country;
      if (linkedinId) user.linkedinId = linkedinId;
      if (twitter) user.twitter = twitter;
      if (facebook) user.facebook = facebook;
      if (designation) user.designation = designation;
      if (image) user.image = image;
      if (resume) user.resume = resume;

      await user.save();
      res.json({ message: 'Account updated successfully', user });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

 ///////////////////////////// TIMEOFF  GET AND POST API  //////////////////////////////////////////////////////////////////////////////////



app.post('/api/timeoff', async (req, res) => {
  try {
    const { Type_of_Time_Off, Reason_for_Time_Off, To, From,Email,Name } = req.body;
    const newTimeOff = new TimeOff({
      Type_of_Time_Off,
      Reason_for_Time_Off,
      To,
      From,
      Name,
      Email
    });
    const savedTimeOff = await newTimeOff.save();
    res.status(201).json(savedTimeOff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/timeoff', async (req, res) => {
  const email = req.query.email;
 
  try {
    const timeOffRequests = await TimeOff.find({Email: email});
    res.status(200).json(timeOffRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/timeoff/approve', async (req, res) => { 
  try {    
 const id  = req.body.id;   
 const found = await TimeOff.findOne({_id:id});
 const timeOffRequests = await TimeOff.findOneAndUpdate({_id:id},{Approved:true});
 console.log(found);
 res.status(200).json({ message: 'Time off request approved successfully' }); 
  } catch (error) { 
    console.error('Error approving time off request:', error); 
    res.status(500).json({ error: 'An error occurred while approving the time off request' });  
 } });

/////////////////////////////////// Task Status for Graph /////////////////////
app.get('/api/task-statuses', async (req, res) => {
  try {
    const name = req.query.name; // Get the name from query parameters
    if (!name) {
      return res.status(400).json({ error: 'Name parameter is required' });
    }
   
    // Query the database to find tasks assigned to the specified name and only return the taskStatus
    const tasks = await createTask.find({ assignedTo: { $regex: new RegExp(name, 'i') } }, 'taskStatus -_id');
 
    // Map the results to return only taskStatus array
    const taskStatuses = tasks.map(task => task.taskStatus);
 
    res.status(200).json(taskStatuses);
  } catch (error) {
    console.error('Failed to retrieve task statuses:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

///////////////////////fatch the task by their status /////////////
app.get('/api/tasks/completed', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Name parameter is required' });
  }
 
  try {
    const completedTasks = await createTask.find({
      assignedTo: { $regex: new RegExp(name, "i") },
      taskStatus: 'Completed'
    });
 
    if (completedTasks.length === 0) {
      return res.status(404).json({ message: 'No completed tasks found for the specified name' });
    }
 
    res.status(200).json(completedTasks);
  } catch (error) {
    console.error('Error retrieving completed tasks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
 
 
app.get('/api/tasks/review', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Name parameter is required' });
  }
 
  try {
    const completedTasks = await createTask.find({
      assignedTo: { $regex: new RegExp(name, "i") },
      taskStatus: 'Review'
    });
 
    if (completedTasks.length === 0) {
      return res.status(404).json({ message: 'No Review tasks found for the specified name' });
    }
 
    res.status(200).json(completedTasks);
  } catch (error) {
    console.error('Error retrieving Review tasks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
 
 
 
app.get('/api/tasks/in-progress', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Name parameter is required' });
  }
 
  try {
    const completedTasks = await createTask.find({
      assignedTo: { $regex: new RegExp(name, "i") },
      taskStatus: 'InProgress'
    });
 
    if (completedTasks.length === 0) {
      return res.status(404).json({ message: 'No In progress tasks found for the specified name' });
    }
 
    res.status(200).json(completedTasks);
  } catch (error) {
    console.error('Error retrieving In progress tasks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/////////////////////// Create Invoice Updated POST /////////////////////////////

app.post('/api/invoices', async (req, res) => {
  try {
    const invoiceData = req.body;
    const newInvoice = new InvoiceForm(invoiceData);
    await newInvoice.save();
    res.status(201).send(newInvoice);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.post('/api/pay-invoices', async (req, res) => {
  try {
    const invoiceData = req.body;
    const invoice = await InvoiceForm.findOne({ invoiceNumber: invoiceData.invoiceNumber });
    const payment = invoice.paidAmount + invoiceData.paidAmount;
    if (!invoiceData.invoiceNumber || !invoiceData.paidAmount  || invoiceData.paidAmount === undefined) {
      return res.status(400).send('Invoice number and paid amount are required');
    }
    console.log(invoiceData);
    const newInvoice = await InvoiceForm.findOneAndUpdate({invoiceNumber: invoiceData.invoiceNumber},{paidAmount:payment});
    res.status(200).send(newInvoice);
  } catch (error) {
    res.status(400).send(error.message);
  }
});


app.post("/checkout", async (req, res) => {
    try{
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: req.body.name,
              },
              unit_amount: req.body.unit_amount*100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: "http://localhost:3001/HomePage",
        cancel_url: "http://localhost:3001/404",
      })
    }catch(err){
      console.log(err);
      res.status(500).send(err.message);
    }
})

app.post("/transfer",async (req,res)=>{
  try{
    const account = await stripe.accounts.create({
      type: 'express', 
      country: 'US', 
      email: req.body.email, 
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      individual:{
        first_name: req.body.firstName,
        last_name: req.body.lastName,
        email: req.body.email,
      },
    });
    console.log('Connected account ID:', account.id);
    const transfer = await stripe.transfers.create({
      amount: req.body.amount *100,
      currency: 'usd',
      destination: account.id,
    });
  }catch(error){
    console.log("Error: " + error);
  }
})
////////////////////////////////// Stripe Checkout ////////////////////////////////////////////////////

app.post('/create-checkout-session', async (req, res) => {
  const { amount,name } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', 
            product_data: {
              name: name,
            },
            unit_amount: amount*100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:3001/success',
      cancel_url: 'http://localhost:3001/fail',
    });

    res.json({ id: session.id });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

//////
// Feedback Schema and Model
const feedbackSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  feedback: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
// Feedback API Endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const { subject, feedback, name } = req.body;

    // Validate the subject value
    const validSubjects = ["good", "bad", "improvement", "other"];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({ error: 'Invalid subject value' });
    }

    const newFeedback = new Feedback({ subject, feedback, name });
    await newFeedback.save();
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Error submitting feedback' });
  }
});


// New endpoint to get all feedback
app.get('/api/feedback', async (req, res) => {
  try {
    const feedback = await Feedback.find();
    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Error fetching feedback' });
  }
});


// Project Suggestion Schema and Model
const projectSuggestionSchema = new mongoose.Schema({
  rating: { type: Number, required: true },
  comments: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ProjectSuggestion = mongoose.model('ProjectSuggestion', projectSuggestionSchema);

// Project Suggestion API Endpoint
app.post('/api/feedback-project', async (req, res) => {
  try {
    const { rating, comments, name } = req.body;
    const newProjectSuggestion = new ProjectSuggestion({ rating, comments, name });
    await newProjectSuggestion.save();
    res.status(201).json({ message: 'Project suggestion feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting project suggestion feedback:', error);
    res.status(500).json({ error: 'Error submitting project suggestion feedback' });
  }
});



  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });


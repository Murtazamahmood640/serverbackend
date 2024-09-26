const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const nodemailer = require("nodemailer");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Add JWT for password reset
const stripe = require('stripe')('sk_test_51POLSORr2k4AYrtAMTYxJpf3cZ55y7E23oRnHNAVtT96O28obBtB6zPA9ts8O7fdum9qIlw733YqhLuUbG6tNh7B008htkEosZ');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallbackdevelopmentsecret';

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(morgan());
app.use(express.static("./public"));

// Multer setup for document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public');
  },
  filename: function (req, file, cb) {
    try {
      if (req.body.email) {
        const email = req.body.email;
        const fileExtension = path.extname(file.originalname);
        const fileName = email + fileExtension;
        cb(null, fileName);
      } else {
        const fileExtension = path.extname(file.originalname);
        const filename = "doc-" + req.body.filename + ".pdf";
        cb(null, filename);
      }
    } catch (e) {
      console.log(e);
    }
  }
});

const upload = multer({ storage: storage });

const DocumentInfoSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  sentBy: { type: String, required: true },
  dated: { type: Date, required: true },
  reason: { type: String, required: true },
  path: { type: String, required: true }
});

const DocumentInfo = mongoose.model('DocumentInfo', DocumentInfoSchema);
app.post('/api/document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.filename || !req.body.sentBy || !req.body.dated || !req.body.reason) {
      return res.status(400).json({ error: 'Missing required fields or file' });
    }

    const data = {
      filename: req.body.filename,
      sentBy: req.body.sentBy,
      dated: req.body.dated,
      reason: req.body.reason,
      path: req.file.path,
    };

    const documentInfo = new DocumentInfo(data);
    await documentInfo.save();

    res.status(200).json({ message: "Successfully Uploaded!" });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const documents = await DocumentInfo.find();
    res.status(200).json(documents);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

mongoose.connect('mongodb://murtazamahmood640:Abidipro12@ac-qnbweaj-shard-00-00.grifjrf.mongodb.net:27017,ac-qnbweaj-shard-00-01.grifjrf.mongodb.net:27017,ac-qnbweaj-shard-00-02.grifjrf.mongodb.net:27017/?ssl=true&replicaSet=atlas-8tadkd-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// // Nodemailer configuration
// const transporter = nodemailer.createTransport({
//   service: 'Outlook',
//   auth: {
//     user: 'shoaibmahmood115@outlook.com',
//     pass: 'Shoaib12$',
//   }
// });


const transporter2 = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'arshia.aptech9904@gmail.com', // replace with your Gmail address
    pass: 'rtdhbmhfppjkmrhh', // replace with your Gmail app password
  },
});




  app.post('/api/scheduleEvent/sendMail', (req, res) => {
    const { email, subject, message, eventTime } = req.body;
  
    // Convert eventTime to a cron schedule
    // Example conversion: "2024-08-10T15:30:00Z" to "30 15 10 8 *"
    const eventDate = new Date(eventTime);
    const cronSchedule = `${eventDate.getMinutes()} ${eventDate.getHours()} ${eventDate.getDate()} ${eventDate.getMonth() + 1} *`;
  
    try {
      cron.schedule(cronSchedule, function () {
        const mailOptions = {
          from: 'abidipro01@outlook.com',
          to: email,
          subject,
          text: message,
        };
  
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.error('Error sending email:', error);
            res.status(500).json({ message: 'Error sending email', error });
          } else {
            console.log('Email sent:', info.response);
            res.status(200).json({ message: 'Email scheduled successfully' });
          }
        });
      });
  
      res.status(200).json({ message: 'Email scheduled successfully' });
    } catch (error) {
      console.error('Error scheduling email:', error);
      res.status(500).json({ message: 'Error scheduling email', error });
    }
  });
  
  // Define the route to send the mail
  app.get('/api/timeoff/mail', async (req, res) => {
    try {
      const { email, reason, off_date, end_date } = req.query;
  
      // Construct mail options
      const mailOptions = {
        from: 'abidipro01@outlook.com',
        to: email,
        subject: 'Time Off Request Approved (Abidi-Pro Solution!)',
        html: `<div class="container">
          <img src="https://abidisolutions.com/wp-content/uploads/2023/09/Official-Abidi-Solutions-website-logo-01.png" height="90" width="170" style="vertical-align: middle;"/>
          <p style="margin-top: 3px;">Welcome to AbidiPro, your time off request for ${reason} is approved by the company.</p>
          <b>Time off Duration</b>
          <ul>
              <li>From: ${new Date(off_date).toLocaleDateString()}</li>
              <li>To: ${new Date(end_date).toLocaleDateString()}</li>
          </ul>
        </div>`
      };
  
      // Send email
      await transporter.sendMail(mailOptions);
  
      // Respond with success
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'An error occurred while sending the email' });
    }
  });
  
// Api to send Welcome Mail

app.get("/api/createUser/mail", (req, res) => {
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
  transport.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log("Email Sent" + info.response);
    }
  })

})

app.get("/api/task/mail", (req, res) => {
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
  transport.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log("Email Sent" + info.response);
    }
  })
  res.status(200).json({ messgae: "email sent!" })
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

  transport.sendMail(mailOptions, function (err, info) {
    if (err) {
      console.log(err);
      res.status(500).json({ message: "Error sending email", error: err });
    } else {
      console.log("Email Sent: " + info.response);
      res.status(200).json({ message: "Notification email sent to manager" });
    }
  })
})



////////dashboard


app.get('/api/employeeCount', async (req, res) => {
  try {
    const count = await User.countDocuments(); // Replace with your actual model
    res.json({ count });
  } catch (error) {
    console.error('Error fetching employee count:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('api/project/count', async (req, res) => {
  try {
    const count = await Project.countDocuments({});
    res.json({ count });
  } catch (error) {
    console.error('Error fetching project count:', error); // Log the exact error
    res.status(500).json({ error: 'Failed to fetch project count' });
  }
});

///////////////////////////// TIME OFF  SCHEMA  //////////////////////////////////////////////////////////////////////////////////


const timeOffSchema = new mongoose.Schema({
  Type_of_Time_Off: String,
  Reason_for_Time_Off: String,
  To: Date,
  From: Date,
  Name: { type: String, required: true },
  Email: { type: String, required: true },
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



// const createInvoiceSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   department: { type: String, required: true },
//   designation: { type: String, required: true },
//   salary: { type: String, required: true },
//   reportingmanager: { type: String, required: true },
//   invoicedate: { type: Date, required: true },
// });

// const Invoice = mongoose.model('Create-Invoice', createInvoiceSchema);



// const InvoiceForm = mongoose.model('Invoice', invoiceSchema);







///////////////////// Time schema ///////////////////

const timeEntrySchema = new mongoose.Schema({
  date: String,
  day: String,
  checkIn: String,
  checkOut: String,
  totalTime: String,
  email: String
}, { timestamps: true })

const TimeEntry = mongoose.model('Time Entry', timeEntrySchema);

app.post('/api/timeEntries', async (req, res) => {
  try {
    const { date, email } = req.body;
    const existingEntry = await TimeEntry.findOne({ date, email }).sort({ createdAt: -1 });
    if (existingEntry) {
      return res.status(400).send({ error: 'A time entry for this date already exists.' });
    }
    const timeEntry = new TimeEntry(req.body);
    await timeEntry.save();
    res.status(201).send(timeEntry);
  } catch (error) {
    console.error("Error creating time entry:", error); // Log the error
    res.status(500).send({ error: 'Internal server error', details: error.message });
  }
});


app.get('/api/timeEntries', async (req, res) => {
  try {
    const timeEntries = await TimeEntry.find({ email: req.query.email }).sort({ date: -1, checkOut: -1 }).limit(10);
    res.status(200).send(timeEntries);
  } catch (error) {
    console.error("Error fetching time entries:", error); // Improved logging
    res.status(500).send({ error: 'Internal server error', details: error.message });
  }
});

// const timeEntrySchema = new mongoose.Schema({
//   date: String,
//   day: String,  
//   checkIn: String,
//   checkOut: String,
//   totalTime: String,
//   email: String
// },{timestamps:true})

// const TimeEntry = mongoose.model('Time Entry', timeEntrySchema);
// app.post('/api/timeEntries', async (req, res) => {
//   try {
//     // Extract necessary fields from request body
//     const { date, email } = req.body;

//     // Check if there's already an entry for the given date and user's email
//     const existingEntry = await TimeEntry.findOne({ date, email }).sort({ createdAt: -1 });

//     // If an entry exists for the given date and email, return an error
//     if (existingEntry) {
//       return res.status(400).send({ error: 'A time entry for this date already exists.' });
//     }

//     // If no entry exists for the given date and email, proceed to create a new entry
//     const timeEntry = new TimeEntry(req.body);
//     await timeEntry.save();
//     res.status(201).send(timeEntry);
//   } catch (error) {
//     res.status(500).send({ error: 'Internal server error' });
//   }
// });


// app.get('/api/timeEntries', async (req, res) => {
//   try {
//     const timeEntries = await TimeEntry.find({email: req.query.email}).sort({date:-1,checkOut:-1}).limit(10);
//     res.status(200).send(timeEntries);
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });


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


const educationSchema = new mongoose.Schema({
  degree: String,
  institution: String,
  year: String,
});

const experienceSchema = new mongoose.Schema({
  company: String,
  role: String,
  years: String,
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  personalEmail: { type: String, required: true },
  password: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  email: { type: String, required: true },
  phoneNumber: { type: String },
  gender: { type: String },
  birthday: { type: Date },
  password: { type: String, required: true },
  street: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  linkedinId: { type: String },
  twitter: { type: String },
  facebook: { type: String },
  education: [educationSchema], // New education field
  experience: [experienceSchema], // New experience field
});
const User = mongoose.model('User', userSchema);



app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `https://fusionhr.vercel.app/reset-password/${token}`;
    const mailOptions = {
      from: 'shoaibmahmood115@outlook.com',
      to: email,
      subject: 'Password Reset',
      text: `You are receiving this because you have requested the reset of the password for your account. Please click on the following link to complete the process: ${resetLink}`
    };

    // Send the email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        // Log token if email sending fails
        console.error('Error sending email:', err);
        console.log(`Reset token (debugging): ${resetLink}`);
        return res.status(500).json({ message: 'Failed to send reset email. Token logged for debugging.' });
      }
      res.status(200).json({ message: 'Reset link sent to your email' });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Reset Password Route
app.post('/api/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if token has expired
    if (Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Check if new password is different from the old password
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the old password' });
    }

    // Hash the new password and save it
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token and expiration
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});










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

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Respond with success
    res.json({
      message: 'Login successful',
      userId: user._id,
      email: user.email,
      designation: user.designation,
      name: user.name
    });

  } catch (error) {
    console.error('Login error:', error); // Log the error
    res.status(500).json({ error: 'Server error' });
  }
});


/////////////////////////////////// PERSONAL DETAIL UPDATE //////////////////////////////////////////////////////////////////////////////////


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
    const user = await User.findOne({ email: userEmail });
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

// In your Express.js server file
app.get('/api/users/current', async (req, res) => {
  try {
    const userId = req.user.id; // Adjust based on how you get the current user's ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
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
      birthday,
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

app.get('/api/getUserById', async (req, res) => {
  try {
    const user = await User.findById(req.query.id);
    if (!user) return res.status(404).send('User not found');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.get("/api/getName", async (req, res) => {
  try {

    const user = await User.find({ email: req.query.email });
    res.json(user[0].name);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.get("/api/getUser", async (req, res) => {
  try {
    const users = await User.find({}, { personalEmail: 1, name: 1, status: 1,  designation: 1, _id: 1, phoneNumber:1, password:1 }); // Include _id
    res.json(users); // Return the data with _id directly
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.delete("/api/deleteUser", async (req, res) => {

  try {
    const users = await User.findOneAndDelete({ _id: req.query.id });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})



app.delete("/api/deleteTask", async (req, res) => {

  try {
    const users = await createTask.findOneAndDelete({ _id: req.query._id });
    res.status(200).json({
      message: "Task deleted successfully",
      deletedTask: users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.put("/api/updateUser/:id", async (req, res) => {
  try {
    const users = await User.findOneAndUpdate({ _id: req.body._id }, req.body);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})



///////////////////// Employee to Payroll //////////////////////

app.post("/api/addEmploy", async (req, res) => {
  try {
    console.log(req.body);
    const employee = new EmployeePayroll(req.body);
    await employee.save();
    res.status(201).send({ message: "Employee added successfully", employee });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

app.get("/api/EmployeesPayroll", async (req, res) => {
  try {
    const employees = await EmployeePayroll.find({});
    console.log(employees);
    res.status(201).send(employees);
  } catch (err) {
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





app.put("/api/updateStatus", async (req, res) => {
  try {
    const tasks = await createTask.findOneAndUpdate({ _id: req.body.id }, { taskStatus: req.body.taskStatus }, { new: true });
    console.log(tasks);
    res.send(tasks);
  } catch (error) {
    console.error(error); // Log the error to the console

    res.status(500).send();
  }
})

// // GET endpoint to fetch all tasks
// app.get('/api/create-tasks', async (req, res) => {
//   try {
//     const tasks = await createTask.find({ 
//       assignedBy: { $regex: new RegExp(req.query.name, "i") }
//     });
//     res.send(tasks);
//   } catch (error) {
//     console.error('Error fetching tasks by assignedBy:', error);
//     res.status(500).send({ message: "Server error" });
//   }
// });


app.get('/api/my-tasks', async (req, res) => {
  try {
    const tasks = await Task.find({ 
      assignedTo: { $regex: new RegExp(req.query.name, "i") }
    });
    res.send(tasks);
  } catch (error) {
    console.error('Error fetching tasks by assignedTo:', error);
    res.status(500).send({ message: "Server error" });
  }
});


// // PATCH endpoint to update a task
// app.patch('/api/create-tasks/update', async (req, res) => {
//   try {
//     const task = await createTask.findByIdAndUpdate(req.body._id, req.body, { new: true, runValidators: true });
//     if (!task) {
//       return res.status(404).send();
//     }
//     res.send(task);
//   } catch (error) {
//     res.status(400).send(error);
//   }
// });



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
    const invoices = await InvoiceForm.find({}).sort({ date: -1 });
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get('/api/viewOne-invoices', async (req, res) => {
  try {
    const invoices = await InvoiceForm.find({ _id: req.query._id });
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
    const users = await User.find().select('name -_id').sort({ name: 1 }); // '-_id' excludes the '_id' field from the results

    // Log the users retrieved to see their structure
    console.log('Users retrieved:', users);

    // Extract names from the user documents and capitalize the first letter
    const names = users
      .filter(user => {
        if (!user.name || typeof user.name !== 'string') {
          console.log('Invalid user name:', user);
          return false;
        }
        return true;
      })
      .map(user => `${user.name[0].toUpperCase()}${user.name.slice(1)}`);

    res.status(200).json(names);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




/////////////////////////////////////////////////////////////////////////////////////////////////////////Account page api ////////////////////
// Update user account details
// Update user account
app.put("/api/users/updateAccount", async (req, res) => {
  const { userId, name, personalEmail, phoneNumber, gender, birthday, street, city, state, country, linkedinId, twitter, facebook, education, experience } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.personalEmail = personalEmail || user.personalEmail;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.gender = gender || user.gender;
    user.birthday = birthday || user.birthday;
    user.street = street || user.street;
    user.city = city || user.city;
    user.state = state || user.state;
    user.country = country || user.country;
    user.linkedinId = linkedinId || user.linkedinId;
    user.twitter = twitter || user.twitter;
    user.facebook = facebook || user.facebook;

    // Update education if provided
    if (education && education.length > 0) {
      user.education = education;
    }

    // Update experience if provided
    if (experience && experience.length > 0) {
      user.experience = experience;
    }

    await user.save();
    res.json({ msg: "Account updated successfully", user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
});



///////////////////////////// TIMEOFF  GET AND POST API  //////////////////////////////////////////////////////////////////////////////////



app.post('/api/timeoff', async (req, res) => {
  try {
    const { Type_of_Time_Off, Reason_for_Time_Off, To, From, Email, Name } = req.body;
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
    let timeOffRequests;
    if (email) {
      timeOffRequests = await TimeOff.find({ Email: email });
    } else {
      timeOffRequests = await TimeOff.find({});
    }
    res.status(200).json(timeOffRequests);
  } catch (error) {
    console.error('Error fetching time off requests:', error);
    res.status(500).json({ message: 'An error occurred while fetching time off requests', error: error.message });
  }
});



app.post('/api/timeoff/approve', async (req, res) => {
  try {
    const id = req.body.id;
    const found = await TimeOff.findOne({ _id: id });
    const timeOffRequests = await TimeOff.findOneAndUpdate({ _id: id }, { Approved: true });
    console.log(found);
    res.status(200).json({ message: 'Time off request approved successfully' });
  } catch (error) {
    console.error('Error approving time off request:', error);
    res.status(500).json({ error: 'An error occurred while approving the time off request' });
  }
});

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

// app.post('/api/invoices', async (req, res) => {
//   try {
//     const invoiceData = req.body;
//     const newInvoice = new InvoiceForm(invoiceData);
//     await newInvoice.save();
//     res.status(201).send(newInvoice);
//   } catch (error) {
//     res.status(400).send(error.message);
//   }
// });

// app.post('/api/pay-invoices', async (req, res) => {
//   try {
//     const invoiceData = req.body;
//     const invoice = await InvoiceForm.findOne({ invoiceNumber: invoiceData.invoiceNumber });
//     const payment = invoice.paidAmount + invoiceData.paidAmount;
//     if (!invoiceData.invoiceNumber || !invoiceData.paidAmount || invoiceData.paidAmount === undefined) {
//       return res.status(400).send('Invoice number and paid amount are required');
//     }
//     console.log(invoiceData);
//     const newInvoice = await InvoiceForm.findOneAndUpdate({ invoiceNumber: invoiceData.invoiceNumber }, { paidAmount: payment });
//     res.status(200).send(newInvoice);
//   } catch (error) {
//     res.status(400).send(error.message);
//   }
// });


app.post("/checkout", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: req.body.name,
            },
            unit_amount: req.body.unit_amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: "http://localhost:3001/HomePage",
      cancel_url: "http://localhost:3001/404",
    })
  } catch (err) {
    console.log(err);
    res.status(500).send(err.message);
  }
})

app.post("/transfer", async (req, res) => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: req.body.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      individual: {
        first_name: req.body.firstName,
        last_name: req.body.lastName,
        email: req.body.email,
      },
    });
    console.log('Connected account ID:', account.id);
    const transfer = await stripe.transfers.create({
      amount: req.body.amount * 100,
      currency: 'usd',
      destination: account.id,
    });
  } catch (error) {
    console.log("Error: " + error);
  }
})
////////////////////////////////// Stripe Checkout ////////////////////////////////////////////////////

app.post('/create-checkout-session', async (req, res) => {
  const { amount, name } = req.body;

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
            unit_amount: amount * 100,
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
  sentiment: { type: String, required: true },
  sentimentScore: { type: Number, required: true },
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

app.use(cors());
app.use(bodyParser.json());
// Feedback API Endpoint
// API Endpoints
app.post('/api/feedback', async (req, res) => {
  try {
    const { subject, feedback, sentiment, sentimentScore, category } = req.body;
    console.log('Received payload:', req.body);

    // Validate subject field
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      console.error('Invalid subject value:', subject);
      return res.status(400).json({ error: 'Invalid subject value' });
    }

    // Validate other fields
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      console.error('Invalid feedback value:', feedback);
      return res.status(400).json({ error: 'Invalid feedback value' });
    }
    if (!sentiment || typeof sentiment !== 'string' || sentiment.trim().length === 0) {
      console.error('Invalid sentiment value:', sentiment);
      return res.status(400).json({ error: 'Invalid sentiment value' });
    }
    if (typeof sentimentScore !== 'number') {
      console.error('Invalid sentimentScore value:', sentimentScore);
      return res.status(400).json({ error: 'Invalid sentimentScore value' });
    }
    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      console.error('Invalid category value:', category);
      return res.status(400).json({ error: 'Invalid category value' });
    }

    const newFeedback = new Feedback({ subject, feedback, sentiment, sentimentScore, category });
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

app.delete('/api/feedback', async (req, res) => {
  try {
    await Feedback.deleteMany();
    res.status(200).json({ message: 'All feedback history cleared' });
  } catch (error) {
    console.error('Error clearing feedback history:', error);
    res.status(500).json({ error: 'Error clearing feedback history' });
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



///////////////////// ChatBot ///////////////////

// // Environment variables
// const GOOGLE_API_KEY = 'AIzaSyCWDgo9mAmsMOeqoX9d5wMXnPs0XhRKEMQ';
// const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Chat Message Schema and Model (if needed)
const chatMessageSchema = new mongoose.Schema({
  userMessage: { type: String, required: true },
  botResponse: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Chatbot API Endpoint
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Received message:', message);

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.error('Invalid message value:', message);
      return res.status(400).json({ error: 'Invalid message value' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([message]);
    const aiResponse = result.response.text();
    console.log('AI response:', aiResponse);

    res.status(201).json({ answer: aiResponse });
  } catch (error) {
    console.error('Error processing chatbot message:', error);
    res.status(500).json({ error: 'Error processing chatbot message' });
  }
});

// Define schemas and models
const clientSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientId: { type: String, required: true, unique: true },
  contactNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  companyName: { type: String, default: '' },
  billingAddress: { type: String, required: true },
  shippingAddress: { type: String, default: '' },
  taxId: { type: String, required: true }
}, { timestamps: true });

const Client = mongoose.model('Client', clientSchema);

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  productId: { type: String, required: true, unique: true },
  category: { type: String, default: '' },
  price: { type: Number, required: true },
  stockQuantity: { type: Number, default: 0 },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

const invoiceSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
    },
  ],
  totalAmount: { type: Number, required: true },
  totalProducts: { type: Number, required: true }
}, { timestamps: true });

const Invoice = mongoose.model('Invoice', invoiceSchema);

// Client API endpoints
app.post('/api/clients', async (req, res) => {
  try {
    const { clientId, email } = req.body;
    const existingClient = await Client.findOne({ $or: [{ clientId }, { email }] });
    if (existingClient) {
      return res.status(400).json({ error: 'Client with this ID or Email already exists.' });
    }
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    console.error('Error adding client:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.find({});
    res.send(clients);
  } catch (error) {
    console.error('Error fetching clients:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Product API endpoints
app.post('/api/products', async (req, res) => {
  try {
    const { productId } = req.body;
    const existingProduct = await Product.findOne({ productId });
    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this ID already exists.' });
    }
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.send(products);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Invoice API endpoints
app.post('/api/invoices', async (req, res) => {
  try {
    const { client, invoiceDate, dueDate, invoiceNumber, products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: "Products must be an array" });
    }

    for (const product of products) {
      const foundProduct = await Product.findById(product.product);
      if (!foundProduct) {
        return res.status(400).json({ error: `Product with ID ${product.product} not found.` });
      }
    }

    const totalAmount = products.reduce((total, item) => {
      const totalWithoutTax = item.quantity * item.unitPrice;
      const taxAmount = (item.tax / 100) * totalWithoutTax;
      const discountAmount = (item.discount / 100) * totalWithoutTax;
      return total + totalWithoutTax + taxAmount - discountAmount;
    }, 0);

    const totalProducts = products.length;

    const invoice = new Invoice({
      client,
      invoiceDate,
      dueDate,
      invoiceNumber,
      products,
      totalAmount,
      totalProducts,
    });
    await invoice.save();

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find({})
      .populate('client', 'clientName')
      .populate({
        path: 'products.product',
        select: 'productName',
      });

    res.status(200).json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// Overview API endpoint
app.get('/api/overview', async (req, res) => {
  try {
    // Total Products
    const totalProducts = await Product.countDocuments();

    // Total Invoices
    const totalInvoices = await Invoice.countDocuments();

    // Total Clients
    const totalClients = await Client.countDocuments();

    // Total Revenue
    const salesSummary = await Invoice.aggregate([
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' }
      }},
    ]);

    // Recent Invoices
    const recentInvoices = await Invoice.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('client', 'clientName')
      .populate({
        path: 'products.product',
        select: 'productName',
      });

    // Top Products
    const topProducts = await Invoice.aggregate([
      { $unwind: '$products' },
      { $group: {
        _id: '$products.product',
        totalSales: { $sum: { $multiply: ['$products.quantity', '$products.unitPrice'] }},
      }},
      { $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productDetails',
      }},
      { $unwind: '$productDetails' },
      { $sort: { totalSales: -1 }},
      { $limit: 5 },
      { $project: {
        productName: '$productDetails.productName',
        totalSales: 1,
      }},
    ]);

    res.status(200).json({
      totalProducts,
      totalInvoices,
      totalClients,
      totalRevenue: salesSummary[0]?.totalRevenue || 0,
      recentInvoices,
      topProducts,
    });
  } catch (error) {
    console.error('Error fetching overview data:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


// Update an existing client by ID
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedClient = await Client.findByIdAndUpdate(id, req.body, { new: true });
    
    if (!updatedClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json({ message: 'Client updated successfully', client: updatedClient });
  } catch (error) {
    res.status(500).json({ error: 'Error updating client: ' + error.message });
  }
});

// Delete a client by ID
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting client: ' + error.message });
  }
});

// Update an existing product by ID
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    res.status(500).json({ error: 'Error updating product: ' + error.message });
  }
});

// Delete a product by ID
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting product: ' + error.message });
  }
});

// Update an existing invoice by ID
app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { products } = req.body;

    if (products && !Array.isArray(products)) {
      return res.status(400).json({ error: "Products must be an array" });
    }

    for (const product of products) {
      const foundProduct = await Product.findById(product.product);
      if (!foundProduct) {
        return res.status(400).json({ error: `Product with ID ${product.product} not found.` });
      }
    }

    const totalAmount = products.reduce((total, item) => {
      const totalWithoutTax = item.quantity * item.unitPrice;
      const taxAmount = (item.tax / 100) * totalWithoutTax;
      const discountAmount = (item.discount / 100) * totalWithoutTax;
      return total + totalWithoutTax + taxAmount - discountAmount;
    }, 0);

    const totalProducts = products.length;

    const updatedInvoice = await Invoice.findByIdAndUpdate(id, {
      ...req.body,
      totalAmount,
      totalProducts,
    }, { new: true });

    if (!updatedInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(200).json({ message: 'Invoice updated successfully', invoice: updatedInvoice });
  } catch (error) {
    res.status(500).json({ error: 'Error updating invoice: ' + error.message });
  }
});

// Delete an invoice by ID
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedInvoice = await Invoice.findByIdAndDelete(id);

    if (!deletedInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting invoice: ' + error.message });
  }
});

// ***** payeeSchema  ******
const payeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
    enum: ['HR', 'Finance', 'Development', 'Marketing', 'Testing'], // Example departments
  },
  bankAccount: {
    type: String,
    required: true,
    match: /^\d+$/, // Ensures that only numeric values are allowed
  },
  taxInformation: {
    taxId: {
      type: String,
      required: true,
      trim: true,
    },
    taxCategory: {
      type: String,
      required: true,
      enum: ['Exempt', 'Standard Rate', 'Reduced Rate'], // Example categories
    },
    taxPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// payment schema

const PaymentSchema = new mongoose.Schema({
  payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payee', // This assumes there's a Payee model
      required: true,
  },
  paymentDate: {
      type: Date,
      required: true,
  },
  paymentAmount: {
      type: Number,
      required: true,
  },
  paymentMethod: {
      type: String,
      enum: ['Cash', 'Credit Card', 'Bank Transfer'], // Ensure only these values are allowed
      required: true,
  },
  deductions: {
      type: Number,
      default: 0,
  },
  bonuses: {
      type: Number,
      default: 0,
  },
}, { timestamps: true });

const Payment = mongoose.model('Payment', PaymentSchema);

const Payee = mongoose.model('Payee', payeeSchema);
// Create a new payee
app.post('/api/payees', async (req, res) => {
  try {
    const { name, employeeId, department, bankAccount, taxInformation } = req.body;

    const payee = new Payee({
      name,
      employeeId,
      department,
      bankAccount,
      taxInformation,
    });

    await payee.save();

    res.status(201).json({ message: 'Payee created successfully', payee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve all payees
app.get('/api/payees', async (req, res) => {
  try {
    const payees = await Payee.find();
    res.json(payees);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update an existing payee by ID
app.put('/api/payees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, employeeId, department, bankAccount, taxInformation } = req.body;

    const updatedPayee = await Payee.findByIdAndUpdate(
      id,
      { name, employeeId, department, bankAccount, taxInformation },
      { new: true }
    );

    if (!updatedPayee) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    res.status(200).json({ message: 'Payee updated successfully', payee: updatedPayee });
  } catch (error) {
    res.status(500).json({ error: 'Error updating payee: ' + error.message });
  }
});

// Delete a payee by ID
app.delete('/api/payees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPayee = await Payee.findByIdAndDelete(id);

    if (!deletedPayee) {
      return res.status(404).json({ error: 'Payee not found' });
    }

    res.status(200).json({ message: 'Payee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting payee: ' + error.message });
  }
});

// Create a new payment
app.post('/api/payments', async (req, res) => {
  console.log(req.body);
  try {
      const { payee, paymentDate, paymentAmount, paymentMethod, deductions, bonuses } = req.body;

      // Validate required fields
      if (!payee || !paymentDate || !paymentAmount || !paymentMethod || !deductions || !bonuses) {
          return res.status(400).json({ error: 'All required fields must be provided' });
      }

      // Create payment record
      const payment = new Payment({
          payee,
          paymentDate,
          paymentAmount,
          paymentMethod,
          deductions,
          bonuses,
      });

      await payment.save();

      res.status(201).json({ message: 'Payment created successfully', payment });
  } catch (error) {
      res.status(500).json({ error: 'Error creating payment: ' + error.message });
  }
});

// Retrieve all payments
app.get('/api/payments', async (req, res) => {
  try {
      const payments = await Payment.find().populate('payee', 'name');
      res.json(payments);
  } catch (error) {
      res.status(500).json({ error: 'Error retrieving payments: ' + error.message });
  }
});

app.get('/api/payroll/overview', async (req, res) => {
  try {
    // Total Payees
    const totalPayees = await Payee.countDocuments();

    // Total Payments
    const totalPayments = await Payment.aggregate([
      {
        $group: {
          _id: null,
          totalPayments: { $sum: '$paymentAmount' },
          totalDeductions: { $sum: '$deductions' },
          totalBonuses: { $sum: '$bonuses' }
        }
      }
    ]);

    // Recent Payments
    const recentPayments = await Payment.find({})
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('payee', 'name employeeId department'); // Ensure 'Payment' model is correctly used

    const overview = {
      totalPayees,
      totalPayments: totalPayments[0]?.totalPayments || 0,
      totalDeductions: totalPayments[0]?.totalDeductions || 0,
      totalBonuses: totalPayments[0]?.totalBonuses || 0,
      recentPayments
    };

    res.status(200).json(overview);
  } catch (error) {
    console.error('Error fetching payroll overview data:', error.message);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});


// *** add contractor schema
const contractorSchema = new mongoose.Schema({
  contractorName: {
      type: String,
      required: true,
  },
  serviceType: {
      type: String,
      required: true,
  },
  contactInformation: {
      phone: {
          type: String,
          required: true,
      },
      email: {
          type: String,
          required: true,
          match: [/.+@.+\..+/, 'Invalid email format'],
      },
      address: {
          type: String,
          required: true,
      },
  },
  projectAssigned: {
      type: String,
      required: true,
  },
  contractStartDate: {
      type: Date,
      required: true,
  },
  contractEndDate: {
      type: Date,
      required: true,
  },
  hourlyRate: {
      type: Number,
      required: true,
      min: 0,
  },
  paymentSchedule: {
      type: String,
      required: true,
  },
  notes: {
      type: String,
  },
});

const Contractor = mongoose.model('Contractor', contractorSchema);

// ** add contactor ***//
app.post('/api/contractors', async (req, res) => {
  try {
      const newContractor = new Contractor(req.body);
      await newContractor.save();
      res.status(201).json(newContractor);
  } catch (error) {
      console.error('Error adding contractor:', error);
      res.status(400).json({ error: error.message });
  }
});
// GET: Retrieve all contractors
app.get('/api/contractors', async (req, res) => {
  try {
      const contractors = await Contractor.find();
      res.status(200).json(contractors);
  } catch (error) {
      console.error('Error fetching contractors:', error);
      res.status(500).json({ error: error.message });
  }
});
// PUT (update) a contractor by ID
app.put('/api/contractors/:id', async (req, res) => {
  try {
      const contractor = await Contractor.findById(req.params.id);
      if (contractor == null) {
          return res.status(404).json({ message: 'Contractor not found' });
      }

      contractor.contractorName = req.body.contractorName || contractor.contractorName;
      contractor.serviceType = req.body.serviceType || contractor.serviceType;
      contractor.projectAssigned = req.body.projectAssigned || contractor.projectAssigned;
      contractor.hourlyRate = req.body.hourlyRate || contractor.hourlyRate;
      contractor.paymentSchedule = req.body.paymentSchedule || contractor.paymentSchedule;
      contractor.notes = req.body.notes || contractor.notes;

      const updatedContractor = await contractor.save();
      res.json(updatedContractor);
  } catch (error) {
      res.status(400).json({ message: error.message });
  }
});

// DELETE a contractor by ID
app.delete('/api/contractors/:id', async (req, res) => {
  try {
      const contractor = await Contractor.findById(req.params.id);
      if (contractor == null) {
          return res.status(404).json({ message: 'Contractor not found' });
      }

      await contractor.remove();
      res.json({ message: 'Contractor deleted successfully' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

const billSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  vendor: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['Paid', 'Unpaid'], required: true },
  documents: { type: String, default: '' }, // to store the file path or URL
}, { timestamps: true });

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;

app.post('/api/bills', async (req, res) => {
  try {
    const { title, dueDate, vendor } = req.body;
    
    // Validate required fields
    if (!title  || !dueDate || !vendor) {
      return res.status(400).json({ error: 'All required fields must be provided.' });
    }

    // Create new bill
    const bill = new Bill(req.body);
    await bill.save();
    res.status(201).json(bill);
  } catch (error) {
    console.error('Error adding bill:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const bills = await Bill.find({});
    res.send(bills);
  } catch (error) {
    console.error('Error fetching bills:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// PUT: Update a bill
app.put('/api/bills/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const updatedBill = await Bill.findByIdAndUpdate(id, req.body, { new: true });
      if (!updatedBill) return res.status(404).json({ message: 'Bill not found' });
      res.json(updatedBill);
  } catch (error) {
      res.status(500).json({ message: 'Error updating bill', error: error.message });
  }
});

// DELETE: Delete a bill
app.delete('/api/bills/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const deletedBill = await Bill.findByIdAndDelete(id);
      if (!deletedBill) return res.status(404).json({ message: 'Bill not found' });
      res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
      res.status(500).json({ message: 'Error deleting bill', error: error.message });
  }
});




// Define the Mileage Claim schema and model
const mileageClaimSchema = new mongoose.Schema({
  claimName: { type: String, required: true },
  serviceType: { type: String, required: true },
  contactInformation: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
  },
  ClaimedProjectFees: { type: String, required: true },
  contractStartDate: { type: Date, required: true },
  contractEndDate: { type: Date, required: true },
  hourlyRate: { type: Number, required: true },
  ClaimDescription: { type: String, required: true },
  notes: { type: String },
}, { timestamps: true });

const MileageClaim = mongoose.model('MileageClaim', mileageClaimSchema);

// POST to Create a new Mileage Claim
app.post('/api/mileage-claims', async (req, res) => {
  try {
    const {
      claimName,
      serviceType,
      contactInformation: { phone, email, address },
      ClaimedProjectFees,
      contractStartDate,
      contractEndDate,
      hourlyRate,
      ClaimDescription,
      notes,
    } = req.body;

    const mileageClaim = new MileageClaim({
      claimName,
      serviceType,
      contactInformation: { phone, email, address },
      ClaimedProjectFees,
      contractStartDate,
      contractEndDate,
      hourlyRate,
      ClaimDescription,
      notes,
    });

    await mileageClaim.save();
    res.status(201).json(mileageClaim);
  } catch (error) {
    console.error('Error adding mileage claim:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.put('/api/mileage-claims/:id', async (req, res) => {
  try {
    const updatedClaim = await MileageClaim.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedClaim) {
      return res.status(404).json({ error: 'Mileage Claim not found' });
    }
    res.json(updatedClaim);
  } catch (error) {
    console.error('Error updating mileage claim:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.get('/api/mileage-claims', async (req, res) => {
  try {
    const mileageClaims = await MileageClaim.find({});
    res.status(200).send(mileageClaims);
  } catch (error) {
    console.error('Error fetching mileage claims:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});





// Define the Expense Claim schema
const expenseClaimSchema = new mongoose.Schema({
  claimName: { type: String, required: true },
  claimType: { type: String, required: true },
  contactInformation: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
  },
  claimAmount: { type: String, required: true },
  Date: { type: Date, required: true },
  ClaimDescription: { type: String, required: true },
  notes: { type: String },
}, { timestamps: true });

// Create the model
const ExpenseClaim = mongoose.model('ExpenseClaim', expenseClaimSchema);

// POST: Create a new Expense Claim
app.post('/api/expense-claims', async (req, res) => {
  try {
    const expenseClaim = new ExpenseClaim(req.body);
    await expenseClaim.save();
    res.status(201).json(expenseClaim);
  } catch (error) {
    console.error('Error adding expense claim:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// GET: Fetch all Expense Claims
app.get('/api/expense-claims', async (req, res) => {
  try {
    const expenseClaims = await ExpenseClaim.find({});
    res.send(expenseClaims);
  } catch (error) {
    console.error('Error fetching expense claims:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// PUT: Update an existing Expense Claim
app.put('/api/expense-claims/:id', async (req, res) => {
  try {
    const expenseClaim = await ExpenseClaim.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!expenseClaim) {
      return res.status(404).json({ error: 'Expense Claim not found' });
    }
    res.json(expenseClaim);
  } catch (error) {
    console.error('Error updating expense claim:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

// DELETE: Delete an Expense Claim
app.delete('/api/expense-claims/:id', async (req, res) => {
  try {
    const expenseClaim = await ExpenseClaim.findByIdAndDelete(req.params.id);
    if (!expenseClaim) {
      return res.status(404).json({ error: 'Expense Claim not found' });
    }
    res.json({ message: 'Expense Claim deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense claim:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});


// Add Vendor schema
const vendorSchema = new mongoose.Schema({
  vendorName: {
      type: String,
      required: true,
      trim: true,  // Removes leading and trailing spaces
  },
  vendorType: {
      type: String,
      required: true,
      trim: true,  // Removes leading and trailing spaces
  },
  contactPerson: {
      type: String,
      required: true,
      trim: true,  // Removes leading and trailing spaces
  },
  contactInformation: {
      phone: {
          type: String,
          required: true,
          trim: true,  // Removes leading and trailing spaces
      },
      email: {
          type: String,
          required: true,
          match: [/.+@.+\..+/, 'Invalid email format'],
          trim: true,  // Removes leading and trailing spaces
      },
      address: {
          type: String,
          required: true,
          trim: true,  // Removes leading and trailing spaces
      },
  },
  serviceProvided: {
      type: String,
      required: true,
      trim: true,  // Removes leading and trailing spaces
  },
  contractStartDate: {
      type: Date,
      required: true,
  },
  contractEndDate: {
      type: Date,
      required: true,
  },
  paymentTerms: {
      type: String,
      required: true,
      trim: true,  // Removes leading and trailing spaces
  },
  notes: {
      type: String,
      trim: true,  // Removes leading and trailing spaces
  },
});

const Vendor = mongoose.model('Vendor', vendorSchema);


//  *** Add Vendor ***
app.post('/api/vendors', async (req, res) => {
  console.log(req.body)
  try {
      // Extract data from request body
      const {
          vendorName,
          vendorType,
          contactPerson,
          contactInformation,
          serviceProvided,
          contractStartDate,
          contractEndDate,
          paymentTerms,
          notes
      } = req.body;

      // Create vendor record
      const vendor = new Vendor({
          vendorName,
          vendorType,
          contactPerson,
          contactInformation,
          serviceProvided,
          contractStartDate,
          contractEndDate,
          paymentTerms,
          notes
      });

      // Save vendor record to the database
      await vendor.save();

      // Send success response
      res.status(201).json({ message: 'Vendor created successfully', vendor });
  } catch (error) {
      // Send error response
      res.status(500).json({ error: 'Error creating vendor: ' + error.message });
  }
});
// Retrieve all Vendor
app.get('/api/vendors', async (req, res) => {
  
  try {
    const vendor = await Vendor.find();
    res.json(vendor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

//  (update) a vendor by ID
app.put('/api/vendors/:id', async (req, res) => {
  try {
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) {
          return res.status(404).json({ message: 'Vendor not found' });
      }

      vendor.vendorName = req.body.vendorName || vendor.vendorName;
      vendor.vendorType = req.body.vendorType || vendor.vendorType;
      vendor.contactPerson = req.body.contactPerson || vendor.contactPerson;
      vendor.contactInformation.phone = req.body.contactInformation.phone || vendor.contactInformation.phone;
      vendor.contactInformation.email = req.body.contactInformation.email || vendor.contactInformation.email;
      vendor.contactInformation.address = req.body.contactInformation.address || vendor.contactInformation.address;
      vendor.serviceProvided = req.body.serviceProvided || vendor.serviceProvided;
      vendor.contractStartDate = req.body.contractStartDate || vendor.contractStartDate;
      vendor.contractEndDate = req.body.contractEndDate || vendor.contractEndDate;
      vendor.paymentTerms = req.body.paymentTerms || vendor.paymentTerms;
      vendor.notes = req.body.notes || vendor.notes;

      const updatedVendor = await vendor.save();
      res.json(updatedVendor);
  } catch (error) {
      res.status(400).json({ message: error.message });
  }
});

// DELETE a vendor 
app.delete('/api/vendors/:id', async (req, res) => {
  try {
      const vendor = await Vendor.findById(req.params.id);
      if (!vendor) {
          return res.status(404).json({ message: 'Vendor not found' });
      }

      await vendor.remove();
      res.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});


const expenseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  vendor: { type: String },
  paymentMethod: { type: String, required: true },
  status: { type: String, required: true, enum: ['Pending', 'Approved', 'Rejected'] },
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);

app.post('/api/expenses', async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find();
    console.log("data", expenses)
    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: error });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.status(200).json(expense);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Overview API
app.get('/api/expoverview', async (req, res) => {
  try {
    const expenseClaim = await ExpenseClaim.countDocuments();
    const expense = await Expense.countDocuments();
    const MilageClaims = await MileageClaim.countDocuments();
    const totalExpense = await Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);

    const recentExpenses = await Expense.find({}).sort({ date: -1 }).limit(5);
    const topProducts = await Expense.aggregate([
      { $group: { _id: "$category", totalSales: { $sum: "$amount" } } },
      { $sort: { totalSales: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      totalProducts: totalBills,
      totalInvoices: totalVendors,
      totalClients: totalContractors,
      totalRevenue: totalExpense[0]?.total || 0,
      recentInvoices: recentExpenses,
      topProducts,
    });
  } catch (error) {
    console.error('Error fetching overview data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const projectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  lead: { type: String, required: true },
  assignedMembers: [{ type: String }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  budget: { type: Number }, // Add budget field
  description: { type: String }, // Add description field
  milestones: [
    {
      name: { type: String },
      dueDate: { type: Date },
      description: { type: String },
    },
  ], // Add milestones field
  client: { type: String }, // Add client field
});

const Project = mongoose.model('Project', projectSchema);


app.post('/api/projects', async (req, res) => {
  try {
    const { projectName, lead, assignedMembers, startDate, endDate, budget, description, milestones, client } = req.body;

    const project = new Project({
      projectName,
      lead,
      assignedMembers,
      startDate,
      endDate,
      budget,
      description,
      milestones,
      client,
    });

    await project.save();
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get all projects created by the current user (lead)
app.get('/api/project/created', async (req, res) => {
  try {
    const projects = await Project.find({
      lead: { $regex: new RegExp(req.query.name, 'i') }, // Filter by lead name (case-insensitive)
    });

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a project by ID
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      projectName, lead, assignedMembers, startDate, endDate, budget,
      description, milestones, client,
    } = req.body;

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        projectName,
        lead,
        assignedMembers,
        startDate,
        endDate,
        budget,
        description,
        milestones, // Allow milestones to be updated
        client,
      },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project updated successfully', project: updatedProject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a project by ID
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




const milestoneSchema = new mongoose.Schema({
  projectName: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, // Ensure this is ObjectId
  milestoneName: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Assuming this is ObjectId
  description: { type: String }
});

const Milestone = mongoose.model('Milestone', milestoneSchema);

app.post('/api/milestones', async (req, res) => {
  try {
    const { projectName, milestoneName, dueDate, status, assignedMembers, description } = req.body;

    const project = await Project.findById(projectName);
    if (!project) {
      return res.status(400).json({ error: 'Project not found' });
    }

    const milestone = new Milestone({
      projectName,
      milestoneName,
      dueDate,
      status,
      assignedMembers,
      description,
    });

    await milestone.save();
    res.status(201).json({ message: 'Milestone created successfully', milestone });
  } catch (error) {
    console.error("Error creating milestone:", error); // Enhanced logging
    res.status(500).json({ error: error.message });
  }
});




// Get all milestones
app.get('/api/milestones', async (req, res) => {
  try {
    const milestones = await Milestone.find()
      .populate('assignedMembers')
      .populate('projectName');
    res.status(200).json(milestones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single milestone by ID
app.get('/api/milestones/:id', async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id)
      .populate('assignedMembers')
      .populate('projectName');
    if (!milestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    res.status(200).json(milestone);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a milestone by ID
app.put('/api/milestones/:id', async (req, res) => {
  try {
    const { milestoneName, dueDate, status, assignedMembers, description } = req.body;

    const updatedMilestone = await Milestone.findByIdAndUpdate(
      req.params.id,
      { milestoneName, dueDate, status, assignedMembers, description },
      { new: true }
    );

    if (!updatedMilestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.status(200).json({ message: 'Milestone updated successfully', milestone: updatedMilestone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a milestone by ID
app.delete('/api/milestones/:id', async (req, res) => {
  try {
    const deletedMilestone = await Milestone.findByIdAndDelete(req.params.id);
    if (!deletedMilestone) {
      return res.status(404).json({ error: 'Milestone not found' });
    }
    res.status(200).json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Task Schema
const taskSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  taskName: { type: String, required: true },
  assignedTo: { type: String, required: true },
  assignedBy: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  taskStatus: { type: String, default: "Pending" },
  priority: { type: String, default: "Medium" },
  relatedMilestone: { type: String },
  textDescription: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Define the Mongoose model
const TasksAssigned = mongoose.model('TasksAssigned', taskSchema);

console.log(TasksAssigned.modelName);        // Output will be 'TasksAssigned'
console.log(TasksAssigned.collection.name);  // Output will be 'tasksassigned'

// POST API to create a new task
app.post('/api/tasks-assigned', async (req, res) => {
  try {
    const {
      projectName,
      taskName,
      assignedTo,
      assignedBy,
      startDate,
      endDate,
      textDescription,
      taskStatus,
      priority,
      relatedMilestone,
    } = req.body;

    const task = new TasksAssigned({
      projectName,
      taskName,
      assignedTo,
      assignedBy,
      startDate,
      endDate,
      textDescription,
      taskStatus,
      priority,
      relatedMilestone,
    });

    await task.save();
    res.status(201).send({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(400).send({ message: 'Error creating task', error });
  }
});

// GET API to fetch tasks assigned to a specific user
app.get('/api/tasks-assigned', async (req, res) => {
  const { assignedTo, assignedBy } = req.query;
  
  try {
    let tasks;
    if (assignedTo) {
      tasks = await TasksAssigned.find({ assignedTo });
    } else if (assignedBy) {
      tasks = await TasksAssigned.find({ assignedBy });
    } else {
      // Fetch all tasks if no parameters are provided
      tasks = await TasksAssigned.find({});
    }
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});


// PUT API to update task status
app.put('/api/tasks-assigned/:id', async (req, res) => {
  try {
    const taskId = req.params.id; // Get the task ID from the URL parameter
    const { taskStatus } = req.body;

    // Find the task by ID and update its status
    const task = await TasksAssigned.findByIdAndUpdate(taskId, { taskStatus }, { new: true });

    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }

    res.status(200).send({ message: 'Task status updated successfully', task });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(400).send({ message: 'Error updating task status', error });
  }
});


// Project Overview API
app.get('/api/project-overview', async (req, res) => {
  try {
    // Count total projects
    const totalProjects = await Project.countDocuments();
    
    // Count total tasks
    const totalTasks = await TasksAssigned.countDocuments();
    
    // Count completed tasks
    const completedTasks = await TasksAssigned.countDocuments({ taskStatus: 'Completed' });
    
    // Calculate pending tasks
    const pendingTasks = totalTasks - completedTasks;
    
    // Fetch most recent 5 projects
    const recentProjects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('assignedMembers') // Assuming assignedMembers is an ObjectId reference to the User model
      .populate('milestones');  // Populate the milestones field

    res.json({
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      recentProjects,
    });
  } catch (error) {
    console.error('Error fetching project overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


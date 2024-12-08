const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');  // Updated to bcryptjs
const axios = require('axios');  // Add axios for handling requests to Flask API

const app = express();
const PORT = 3000;
const FLASK_API_URL = 'http://localhost:5001';  // Flask API URL

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/otpLoginApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());  // Parse incoming JSON data

// User Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// In-memory OTP storage
const otpStorage = {};

// Function to send OTP via Nodemailer
const sendOtpEmail = (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sreekar1415@gmail.com',
      pass: 'sgse scpy bwvs ljxp',
    },
  });

  const mailOptions = {
    from: 'sreekar1415@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP is ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

// Signup Route
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);  // Use bcryptjs to hash password
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStorage[email] = { otp, type: 'email' }; // Store OTP for email verification
    sendOtpEmail(email, otp); // Send OTP to email

    res.send({ success: true, message: 'User registered successfully. OTP sent to email.' });
  } catch (error) {
    console.error('Signup error', error);
    res.status(500).send({ success: false, message: 'Internal server error' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.send({ success: false, message: 'User does not exist' });
    }

    const isMatch = await bcrypt.compare(password, user.password);  // Use bcryptjs to compare password
    if (!isMatch) {
      return res.send({ success: false, message: 'Incorrect password' });
    }

    // If login is successful, send OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStorage[email] = { otp, type: 'email' };

    sendOtpEmail(email, otp); // Send OTP to email

    res.send({ success: true, message: 'Login successful. OTP sent to your email for verification.' });
  } catch (error) {
    console.error('Login error', error);
    res.status(500).send({ success: false, message: 'Internal server error' });
  }
});

// OTP Verification Route for Email
app.post('/verify-email-otp', (req, res) => {
  const { email, otp } = req.body;

  if (otpStorage[email] && otpStorage[email].type === 'email' && otpStorage[email].otp.toString() === otp.toString()) {
    delete otpStorage[email];
    res.send({ success: true, message: 'Email OTP verified successfully' });
  } else {
    res.send({ success: false, message: 'Invalid Email OTP' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

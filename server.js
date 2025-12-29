// server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ====== MIDDLEWARE ======
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public')); // serve frontend files from /public

// ====== MONGODB CONNECTION ======
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance_db';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ====== SCHEMAS & MODELS ======
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roll: { type: String, required: true, unique: true },
});

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  status: { type: String, enum: ['Present', 'Absent'], required: true },
});

const Student = mongoose.model('Student', studentSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);

// ====== ROUTES ======

// Test route
app.get('/api', (req, res) => {
  res.send('Student Attendance API working');
});

// Add a new student
app.post('/api/students', async (req, res) => {
  try {
    const { name, roll } = req.body;

    if (!name || !roll) {
      return res.status(400).json({ message: 'Name and roll are required' });
    }

    const existing = await Student.findOne({ roll });
    if (existing) {
      return res.status(400).json({ message: 'Student with this roll already exists' });
    }

    const student = new Student({ name, roll });
    await student.save();

    res.status(201).json(student);
  } catch (err) {
    console.error('Error adding student:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.find().sort({ roll: 1 });
    res.json(students);
  } catch (err) {
    console.error('Error getting students:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { studentId, date, status } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ message: 'studentId, date, and status are required' });
    }

    let attendance = await Attendance.findOne({ student: studentId, date });

    if (attendance) {
      attendance.status = status;
      await attendance.save();
      return res.json({ message: 'Attendance updated', attendance });
    }

    attendance = new Attendance({
      student: studentId,
      date,
      status,
    });

    await attendance.save();
    res.status(201).json({ message: 'Attendance marked', attendance });
  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance (optionally filter by date: /api/attendance?date=YYYY-MM-DD)
app.get('/api/attendance', async (req, res) => {
  try {
    const { date } = req.query;

    const filter = {};
    if (date) filter.date = date;

    const records = await Attendance.find(filter).populate('student').sort({ date: 1 });
    res.json(records);
  } catch (err) {
    console.error('Error getting attendance:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance for a specific student
app.get('/api/attendance/student/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const records = await Attendance.find({ student: studentId }).sort({ date: 1 });
    res.json(records);
  } catch (err) {
    console.error('Error getting student attendance:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

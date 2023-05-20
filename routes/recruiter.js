const express = require('express');
const { pool } = require("../config");
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const { isLoggedIn } = require("../middleware");
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
router.get('/getData', isLoggedIn, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM recruiters WHERE user_id=?', [req.user.user_id]);
    console.log("applicant GetData", req.user.user_id)
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const passwordValidator = (value, helpers) => {
    if (value.length < 8) {
      throw new Joi.ValidationError("Password must contain at least 8 characters");
    }
    if (!(value.match(/[a-z]/) && value.match(/[A-Z]/) && value.match(/[0-9]/))) {
      throw new Joi.ValidationError("Password must be harder");
    }
    return value;
  };
  
  const signupSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().custom(passwordValidator),
    confirm_password: Joi.string().required().valid(Joi.ref("password")),
  });
  

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/signup', async (req, res) => {

  try {
    await signupSchema.validateAsync(req.body, { abortEarly: false });
  } catch (err) {
    return res.status(400).send(err);
  }
  try {
    const email = req.body.email;
    const password = req.body.password;
    const role = "recruiter";

    // เข้ารหัสรหัสผ่านก่อนเก็บในฐานข้อมูล
    const hashedPassword = await bcrypt.hash(password, 10);

    const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // บันทึกผู้ใช้ในฐานข้อมูล
    await pool.query('INSERT INTO users (email, password, role) VALUES (?, ?, ? )', [email, hashedPassword, role]);
    console.log("User registered successfully")
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



//สำหรับตรวจสอบไฟล์ ที่รับมา
const profileEditSchema = Joi.object({
  company_name: Joi.string().required(),
  email: Joi.string().email().required(),
  description: Joi.string().required(),
  company_video: Joi.string().required(),
});

// ตั้งค่า multer upload
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'static/uploads/'); // กำหนดโฟลเดอร์ที่จะเก็บไฟล์ให้เป็น static/resume/
    },
    filename: function (req, file, cb) {
      const uniqueFileName = `${uuidv4().slice(0, 4)}-${file.originalname}`;
      cb(null, uniqueFileName); // กำหนดชื่อไฟล์เก็บในโฟลเดอร์เป็นชื่อที่ไม่ซ้ำกัน
    }
  }),
  limits: {
    fileSize: 15 * 1024 * 1024  // กำหนดขนาดสูงสุดของไฟล์เป็น 15MB
  }
});

router.post("/editProfile", isLoggedIn, upload.single('profile_image'), async (req, res) => {
  
  try {
    // ตรวจสอบความถูกต้องของข้อมูลที่รับเข้ามา
    const { error } = profileEditSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    // ดึงข้อมูลบริษัทที่ต้องการแก้ไขจากฐานข้อมูล
    const {
      company_name,
      email,
      description,
      company_video,
    } = req.body;
    const companyId = req.user.user_id;
    const filePath = req.file.path;
    console.log("ResumePath", filePath)
      // อัปเดตข้อมูลบริษัทในตาราง recruiters (หากมีการอ้างอิงผ่านฟิลด์ companyId)
      const updateRecruitersQuery = `UPDATE recruiters SET name = ?, email = ?, description = ?, profile_image = ? company_video = ? WHERE user_id = ?`;

      const updateRecruitersValues = [req.body.company_name, req.body.email, req.body.description, filePath,company_video, companyId];

      await pool.query('UPDATE recruiters SET company_name = ?, email = ?, description = ?, profile_image = ? WHERE user_id = ?',[company_name, email, description, filePath, companyId]);
      console.log("Recruiter edit Successfuly")
      return res.json({ message: 'File uploaded successfully', profile_image:filePath });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;

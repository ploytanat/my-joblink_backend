const express = require('express');
const { pool } = require("../config");
const router = express.Router();
const Joi = require('joi');
const bcrypt = require('bcrypt');
const { generateToken } = require("../utils/token");
const { isLoggedIn } = require("../middleware");
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

router.get('/getData', isLoggedIn, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM applicants WHERE user_id=?', [req.user.user_id]);
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
    const role = "applicant";
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

router.post("/editProfile", isLoggedIn, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      birthdate,
      phone_number,
      gender,
      email,
      address,
    } = req.body;

    const userId = req.user.user_id;

    // ใช้ Joi เพื่อตรวจสอบข้อมูลที่ผู้ใช้แก้ไข
    const schema = Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      birthdate: Joi.date().required(),
      phone_number: Joi.string().length(10).pattern(/^[0-9]+$/).required(),
      gender: Joi.string().valid("ชาย", "หญิง").required(),
      email: Joi.string().email().required(),
      address: Joi.string().required(),
    });

    // ตรวจสอบข้อมูล
    const { error } = schema.validate({
      firstName,
      lastName,
      birthdate,
      phone_number,
      gender,
      email,
      address,
    });

    if (error) {
      return res.status(400).json({ message: "โปรดกรอกข้อมูลให้ถูกต้อง", error });
    }

    // อัพเดตข้อมูลส่วนตัวในฐานข้อมูล
    await pool.query(
      `UPDATE applicants SET firstName=?, lastName=?, birthdate=?, phone_number=?, gender=?, email=?, address=? WHERE user_id=?`,
      [firstName, lastName, birthdate, phone_number, gender, email, address, userId]
    );

    await pool.query(
      `UPDATE users SET email=? WHERE user_id=?`,
      [email, userId]
    );
    

    res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ" });
  } catch (error) {
    console.error(error);
    
    res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = router;

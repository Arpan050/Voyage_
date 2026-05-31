const express  = require("express");
const { body } = require("express-validator");
const { register, login, getMe, updateMe, changePassword } = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const { validate }     = require("../middleware/errorHandler");

const router = express.Router();

router.post("/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 }).withMessage("Min 8 characters")
      .matches(/[A-Z]/).withMessage("Must contain uppercase")
      .matches(/[0-9]/).withMessage("Must contain a number"),
    body("phone").optional().trim(),
  ],
  validate, register
);

router.post("/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate, login
);

router.get("/me",               authenticate, getMe);
router.patch("/me",             authenticate, updateMe);
router.post("/change-password", authenticate, changePassword);

module.exports = router;

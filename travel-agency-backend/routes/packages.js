const express = require("express");
const { body } = require("express-validator");
const { getAllPackages, getPackageById, createPackage, updatePackage, deletePackage } = require("../controllers/packageController");
const { requireAdmin } = require("../middleware/auth");
const { validate }     = require("../middleware/errorHandler");

const router = express.Router();

router.get("/",    getAllPackages);
router.get("/:id", getPackageById);

router.post("/",
  ...requireAdmin,
  [
    body("name").trim().notEmpty(),
    body("destination").trim().notEmpty(),
    body("region").isIn(["europe","asia","americas","africa","oceania"]),
    body("price").isFloat({ min: 0 }),
    body("duration_days").isInt({ min: 1 }),
  ],
  validate,
  createPackage
);

router.patch("/:id",  ...requireAdmin, updatePackage);
router.delete("/:id", ...requireAdmin, deletePackage);

module.exports = router;

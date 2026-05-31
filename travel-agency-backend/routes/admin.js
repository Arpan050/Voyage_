const express = require("express");
const { getStats, getUsers, updateUserRole, getRevenue } = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/stats",             ...requireAdmin, getStats);
router.get("/users",             ...requireAdmin, getUsers);
router.patch("/users/:id/role",  ...requireAdmin, updateUserRole);
router.get("/revenue",           ...requireAdmin, getRevenue);

module.exports = router;

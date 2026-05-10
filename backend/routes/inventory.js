const express = require("express");
const os = require("os");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

const Inventory = require("../models/Inventory");
const Notification = require("../models/Notification");
const BlockchainEvent = require("../models/BlockchainEvent");

const { getCompatibleDonors } = require("../utils/compatibility");

const auth = require("../middleware/auth");
const authorizeRole = require("../middleware/authorizeRole");

const router = express.Router();

function getLanIp() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }

  return null;
}

function getFrontendUrl() {
  return "https://blockchain-project-ivory.vercel.app";
}

// ===============================
// ADD BLOOD UNIT
// ===============================
router.post(
  "/add",
  auth,
  authorizeRole("hospital"),
  async (req, res) => {
    try {
      const { bloodGroup, donorId, expiryDate, blockchainHash } = req.body;

      if (!bloodGroup || !expiryDate) {
        return res.status(400).json({
          message: "bloodGroup and expiryDate are required",
        });
      }

      const unitId = uuidv4();

      const frontendUrl = getFrontendUrl(req);

     const verifyUrl = `${getFrontendUrl()}/verify/${unitId}`;

      // Generate QR
      const qrImage = await QRCode.toDataURL(verifyUrl, {
        errorCorrectionLevel: "H",
        width: 300,
      });

      // Save inventory
      const newUnit = new Inventory({
        bloodGroup,
        donorId: donorId || null,
        collectionDate: new Date(),
        expiryDate,
        blockchainHash,
        unitId,
        qrCode: qrImage,
        availableUnits: 1,
        hospitalId: req.user.id,
      });

      await newUnit.save();

      // Blockchain log
      await BlockchainEvent.create({
        action: "BLOOD_UNIT_ADDED",
        details: `Hospital ${req.user.id} added blood unit ${unitId} — Group: ${bloodGroup}`,
      });

      res.json({
        message: "Blood unit added successfully",
        unitId: newUnit.unitId,
        qrCode: newUnit.qrCode,
        verifyUrl,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

// ===============================
// GET INVENTORY
// ===============================
router.get(
  "/",
  auth,
  authorizeRole("hospital", "admin", "bloodbank"),
  async (req, res) => {
    try {
      const filter =
        req.user.role === "hospital"
          ? { hospitalId: req.user.id }
          : {};

      const units = await Inventory.find(filter).sort({
        bloodGroup: 1,
      });

      const groupMap = {};

      for (const unit of units) {
        const g = unit.bloodGroup;

        if (!groupMap[g]) {
          groupMap[g] = {
            bloodGroup: g,
            availableUnits: 0,
            expiryDate: unit.expiryDate,
          };
        }

        groupMap[g].availableUnits += unit.availableUnits;

        if (
          unit.expiryDate &&
          unit.expiryDate < groupMap[g].expiryDate
        ) {
          groupMap[g].expiryDate = unit.expiryDate;
        }
      }

      const summary = Object.values(groupMap).sort((a, b) =>
        a.bloodGroup.localeCompare(b.bloodGroup)
      );

      res.json({
        summary,
        units,
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ===============================
// UPDATE INVENTORY
// ===============================
router.post(
  "/update",
  auth,
  authorizeRole("hospital"),
  async (req, res) => {
    try {
      const {
        bloodGroup,
        units,
        expiryDate,
        storageTemperature,
      } = req.body;

      if (!bloodGroup || units == null || units <= 0) {
        return res.status(400).json({
          message: "bloodGroup and units are required",
        });
      }

      if (!expiryDate) {
        return res.status(400).json({
          message: "expiryDate is required",
        });
      }

      let inventory = await Inventory.findOne({
        bloodGroup,
        hospitalId: req.user.id,
      });

      if (inventory) {
        inventory.availableUnits += units;

        if (expiryDate) {
          inventory.expiryDate = expiryDate;
        }

        if (storageTemperature) {
          inventory.storageTemperature = storageTemperature;
        }

        await inventory.save();
      } else {
        inventory = await Inventory.create({
          bloodGroup,
          availableUnits: units,
          expiryDate,
          storageTemperature,
          hospitalId: req.user.id,
        });
      }

      // Low stock notification
      if (inventory.availableUnits < inventory.threshold) {
        await Notification.create({
          message: `Low stock alert: ${inventory.bloodGroup} has only ${inventory.availableUnits} units`,
          type: "LOW_STOCK",
        });
      }

      // Blockchain log
      await BlockchainEvent.create({
        action: "INVENTORY_UPDATED",
        details: `Hospital ${req.user.id} updated ${bloodGroup} stock to ${inventory.availableUnits} units`,
      });

      res.json({
        message: "Inventory updated",
        inventory,
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ===============================
// EDIT INVENTORY
// ===============================
router.put(
  "/:id",
  auth,
  authorizeRole("hospital", "admin"),
  async (req, res) => {
    try {
      const {
        units,
        expiryDate,
        storageTemperature,
        threshold,
      } = req.body;

      const inventory = await Inventory.findById(req.params.id);

      if (!inventory) {
        return res.status(404).json({
          error: "Inventory not found",
        });
      }

      if (units !== undefined) {
        inventory.availableUnits = units;
      }

      if (expiryDate) {
        inventory.expiryDate = expiryDate;
      }

      if (storageTemperature) {
        inventory.storageTemperature = storageTemperature;
      }

      if (threshold !== undefined) {
        inventory.threshold = threshold;
      }

      await inventory.save();

      // Low stock notification
      if (inventory.availableUnits < inventory.threshold) {
        await Notification.create({
          message: `Low stock alert: ${inventory.bloodGroup} has only ${inventory.availableUnits} units`,
          type: "LOW_STOCK",
        });
      }

      res.json({
        message: "Inventory updated successfully",
        inventory,
      });
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

// ===============================
// REQUEST BLOOD
// ===============================
router.post(
  "/request",
  auth,
  authorizeRole("hospital"),
  async (req, res) => {
    try {
      const { bloodGroup, units, emergency } = req.body;

      if (!bloodGroup || !units || units <= 0) {
        return res.status(400).json({
          message: "Invalid request data",
        });
      }

      const compatibleGroups = getCompatibleDonors(bloodGroup);

      let query = {
        hospitalId: req.user.id,
        availableUnits: { $gte: units },
      };

      if (compatibleGroups !== null) {
        query.bloodGroup = {
          $in: compatibleGroups,
        };
      }

      const availableStock = await Inventory.find(query);

      // Emergency notification
      if (!availableStock.length) {
        await Notification.create({
          message: `Emergency request: ${units} units of ${bloodGroup} needed`,
          type: "EMERGENCY_REQUEST",
        });
      }

      // Blockchain log
      await BlockchainEvent.create({
        action: "BLOOD_REQUEST",
        details: `Hospital ${req.user.id} requested ${units} units of ${bloodGroup} (Emergency: ${
          emergency || false
        })`,
      });

      res.json({
        message: "Request processed",
        availableStock,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
      });
    }
  }
);

module.exports = router;
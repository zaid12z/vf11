var express = require("express");
var router = express.Router();
var app = express();

router.use("/", require("./virtfusion"))
router.use("/", require("./post"))
router.use("/", require("./get"))
router.use("/", require("./virtfusion"))

module.exports = router;
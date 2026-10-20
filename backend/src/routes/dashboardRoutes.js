const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { autenticar } = require('../middlewares/authMiddleware');

router.use(autenticar);

router.get('/', dashboardController.obterMetricas);

module.exports = router;

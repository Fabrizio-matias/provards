const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.get('/me', autenticar, authController.me);
router.post('/logout', autenticar, authController.logout);

module.exports = router;

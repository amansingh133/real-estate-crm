import { Router } from 'express';
import {
  registerOrganization,
  verifyRegistrationOtp,
  resendOtp,
  login,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  registerFcmToken,
  logout,
} from '../controllers/auth.controller.js';
import {
  registerOrganizationValidator,
  verifyOtpValidator,
  resendOtpValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  registerFcmTokenValidator,
} from '../validators/auth.validator.js';
import { validate } from '../middlewares/validate.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/register-organization', authLimiter, registerOrganizationValidator, validate, registerOrganization);
router.post('/verify-otp', authLimiter, verifyOtpValidator, validate, verifyRegistrationOtp);
router.post('/resend-otp', authLimiter, resendOtpValidator, validate, resendOtp);
router.post('/login', authLimiter, loginValidator, validate, login);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidator, validate, resetPassword);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/fcm-token', protect, registerFcmTokenValidator, validate, registerFcmToken);
router.post('/logout', protect, logout);

export default router;

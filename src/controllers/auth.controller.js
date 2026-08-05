import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Organization } from '../models/organization.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { buildOtpPayload, verifyOtp, clearOtp } from '../services/otp.service.js';
import { sendOtpEmail } from '../services/email.service.js';
import { issueAccessToken } from '../services/token.service.js';
import { OTP_PURPOSE, ROLE } from '../utils/constants.js';

const slugifyOrgCode = (name) =>
  `${name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

// POST /auth/register-organization
// Self-service signup: creates a brand-new Organization plus its first
// Admin user in one atomic transaction. Employees are never created here —
// an Admin adds them afterwards via /admin/employees.
export const registerOrganization = asyncHandler(async (req, res) => {
  const { organizationName, name, email, mobileNumber, gender, address, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists.', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const otp = buildOtpPayload(OTP_PURPOSE.REGISTER);

  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      await Organization.create(
        [{ _id: orgId, name: organizationName, code: slugifyOrgCode(organizationName), createdBy: userId }],
        { session }
      );

      [user] = await User.create(
        [
          {
            _id: userId,
            name,
            email,
            username: email,
            mobileNumber,
            gender,
            address,
            passwordHash,
            role: ROLE.ADMIN,
            organization: orgId,
            otp,
          },
        ],
        { session }
      );
    });
  } finally {
    session.endSession();
  }

  await sendOtpEmail({ to: user.email, name: user.name, otp: otp.code, purpose: OTP_PURPOSE.REGISTER });

  return sendSuccess(res, 201, 'Organization and admin account created. An OTP has been sent to your email for verification.', {
    userId: user._id,
    organizationId: orgId,
    email: user.email,
  });
});

// POST /auth/verify-otp
export const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('No account found with this email.', 'USER_NOT_FOUND');
  if (user.isVerified) throw ApiError.badRequest('Account is already verified.', 'ALREADY_VERIFIED');

  verifyOtp(user, otp, OTP_PURPOSE.REGISTER);

  user.isVerified = true;
  clearOtp(user);
  await user.save();

  const token = issueAccessToken(user);

  return sendSuccess(res, 200, 'Email verified successfully.', {
    token,
    user: user.toSafeObject(),
  });
});

// POST /auth/resend-otp
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('No account found with this email.', 'USER_NOT_FOUND');
  if (user.isVerified) throw ApiError.badRequest('Account is already verified.', 'ALREADY_VERIFIED');

  user.otp = buildOtpPayload(OTP_PURPOSE.REGISTER);
  await user.save();

  await sendOtpEmail({ to: user.email, name: user.name, otp: user.otp.code, purpose: OTP_PURPOSE.REGISTER });

  return sendSuccess(res, 200, 'A new OTP has been sent to your email.');
});

// POST /auth/login
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
  }).select('+passwordHash');

  if (!user) throw ApiError.unauthorized('Invalid username or password.', 'INVALID_CREDENTIALS');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized('Invalid username or password.', 'INVALID_CREDENTIALS');

  if (!user.isVerified) {
    throw ApiError.forbidden('Account not verified. Please verify your email using the OTP sent at registration.', 'ACCOUNT_NOT_VERIFIED');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated. Contact your organization admin.', 'ACCOUNT_DEACTIVATED');
  }

  const org = await Organization.findById(user.organization);
  if (!org || !org.isActive) {
    throw ApiError.forbidden('Your organization account is inactive.', 'ORGANIZATION_INACTIVE');
  }

  const token = issueAccessToken(user);

  return sendSuccess(res, 200, 'Login successful.', {
    token,
    user: user.toSafeObject(),
  });
});

// POST /auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('No account found with this email.', 'USER_NOT_FOUND');

  user.otp = buildOtpPayload(OTP_PURPOSE.FORGOT_PASSWORD);
  await user.save();

  await sendOtpEmail({ to: user.email, name: user.name, otp: user.otp.code, purpose: OTP_PURPOSE.FORGOT_PASSWORD });

  return sendSuccess(res, 200, 'An OTP to reset your password has been sent to your email.');
});

// POST /auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('No account found with this email.', 'USER_NOT_FOUND');

  verifyOtp(user, otp, OTP_PURPOSE.FORGOT_PASSWORD);

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  clearOtp(user);
  await user.save();

  return sendSuccess(res, 200, 'Password reset successfully. Please login with your new password.');
});

// GET /auth/profile
export const getProfile = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, 'Profile fetched successfully.', req.user.toSafeObject());
});

// PUT /auth/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, address, mobileNumber } = req.body;

  if (name !== undefined) req.user.name = name;
  if (address !== undefined) req.user.address = address;
  if (mobileNumber !== undefined) req.user.mobileNumber = mobileNumber;

  await req.user.save();

  return sendSuccess(res, 200, 'Profile updated successfully.', req.user.toSafeObject());
});

// POST /auth/fcm-token
export const registerFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  if (!req.user.fcmTokens.includes(fcmToken)) {
    req.user.fcmTokens.push(fcmToken);
    await req.user.save();
  }

  return sendSuccess(res, 200, 'Device registered for notifications.');
});

// POST /auth/logout
export const logout = asyncHandler(async (req, res) => {
  // Stateless JWT: logout is handled client-side by discarding the token.
  // If a specific device token was supplied, stop sending it push notifications.
  const { fcmToken } = req.body;
  if (fcmToken) {
    req.user.fcmTokens = req.user.fcmTokens.filter((t) => t !== fcmToken);
    await req.user.save();
  }
  return sendSuccess(res, 200, 'Logged out successfully.');
});

import { body } from "express-validator";
import { GENDER_VALUES } from "../utils/constants.js";

// Self-service registration always creates a brand-new Organization with the
// registering user as its first Admin. Employees are added later by that
// Admin via /admin/employees — they never self-register.
export const registerOrganizationValidator = [
  body("organizationName")
    .trim()
    .notEmpty()
    .withMessage("Organization name is required"),
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("mobileNumber")
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage("Mobile number must be a valid 10-digit number"),
  body("gender")
    .isIn(GENDER_VALUES)
    .withMessage(`Gender must be one of: ${GENDER_VALUES.join(", ")}`),
  body("address").optional().trim(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Password and confirm password do not match");
    }
    return true;
  }),
];

export const verifyOtpValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("otp").trim().notEmpty().withMessage("OTP is required"),
];

export const resendOtpValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
];

export const loginValidator = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username (email) is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
];

export const resetPasswordValidator = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email is required")
    .normalizeEmail({ gmail_remove_dots: false }),
  body("otp").trim().notEmpty().withMessage("OTP is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const registerFcmTokenValidator = [
  body("fcmToken").trim().notEmpty().withMessage("fcmToken is required"),
];

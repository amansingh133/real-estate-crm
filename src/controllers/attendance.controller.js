import { Attendance } from '../models/attendance.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { reverseGeocode } from '../services/geocode.service.js';
import { getClientIp } from '../utils/getClientIp.js';
import { getMonthlyAttendance } from '../services/attendance.service.js';

const pad = (n) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const buildPunch = async ({ req, latitude, longitude, address }) => ({
  time: new Date(),
  latitude,
  longitude,
  // Prefer the address the Android app resolved on-device; only fall back
  // to a best-effort server-side reverse geocode if none was sent.
  address: address || (await reverseGeocode(latitude, longitude)),
  ipAddress: getClientIp(req),
});

// POST /attendance/toggle
// Single dynamic endpoint driving the Login/Logout button: figures out
// whether this is today's check-in or check-out based on existing state.
export const toggleAttendance = asyncHandler(async (req, res) => {
  const { latitude, longitude, address } = req.body;
  const date = todayKey();

  let record = await Attendance.findOne({ user: req.user._id, date });

  if (!record) {
    const checkIn = await buildPunch({ req, latitude, longitude, address });
    record = await Attendance.create({
      organization: req.user.organization,
      user: req.user._id,
      date,
      checkIn,
    });
    return sendSuccess(res, 201, 'Checked in successfully.', { action: 'CHECK_IN', attendance: record });
  }

  if (record.checkOut) {
    throw ApiError.conflict('You have already checked out for today.', 'ALREADY_CHECKED_OUT_TODAY');
  }

  record.checkOut = await buildPunch({ req, latitude, longitude, address });
  await record.save();
  return sendSuccess(res, 200, 'Checked out successfully.', { action: 'CHECK_OUT', attendance: record });
});

// GET /attendance/status
// Tells the Android app whether to render the button as "Login" or "Logout".
export const getTodayStatus = asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ user: req.user._id, date: todayKey() });

  return sendSuccess(res, 200, "Today's attendance status fetched successfully.", {
    checkedIn: Boolean(record),
    checkedOut: Boolean(record?.checkOut),
    nextAction: !record ? 'CHECK_IN' : !record.checkOut ? 'CHECK_OUT' : 'DONE_FOR_TODAY',
    attendance: record || null,
  });
});

// GET /attendance/report/monthly?month=&year=
export const getMyMonthlyAttendance = asyncHandler(async (req, res) => {
  const report = await getMonthlyAttendance({
    userId: req.user._id,
    month: req.query.month,
    year: req.query.year,
  });
  return sendSuccess(res, 200, 'Monthly attendance report fetched successfully.', report);
});

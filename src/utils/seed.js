/**
 * Optional helper: creates one pre-verified test Organization + Admin user
 * so you can start testing protected/admin routes immediately without
 * walking through the register -> OTP -> verify flow every time.
 *
 * Run with: npm run seed
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/user.model.js';
import { Organization } from '../models/organization.model.js';
import { ROLE } from '../utils/constants.js';

const TEST_EMAIL = 'test.admin@example.com';
const TEST_PASSWORD = 'Test@1234';
const TEST_ORG_NAME = 'Demo Realty Pvt Ltd';

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ email: TEST_EMAIL });
  if (existing) {
    console.log(`ℹ️  Test admin already exists: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
    await mongoose.disconnect();
    return;
  }

  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  await Organization.create({
    _id: orgId,
    name: TEST_ORG_NAME,
    code: `DEMO${Math.floor(100 + Math.random() * 900)}`,
    createdBy: userId,
  });

  await User.create({
    _id: userId,
    name: 'Test Admin',
    email: TEST_EMAIL,
    username: TEST_EMAIL,
    mobileNumber: '9999999999',
    gender: 'Male',
    address: 'Delhi, India',
    passwordHash,
    role: ROLE.ADMIN,
    organization: orgId,
    isVerified: true,
  });

  console.log(`✅ Test organization + admin created: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

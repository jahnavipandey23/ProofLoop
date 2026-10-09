import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many authentication attempts. Try again in 15 minutes.' } });
function issueToken(user) { return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }); }
function publicUser(user) { return { id: user._id.toString(), name: user.name, email: user.email }; }

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ message: 'Password must be between 8 and 128 characters.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists. Log in instead.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    return res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) { if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' }); next(error); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Incorrect email or password.' });
    return res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const update = {};
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2 || name.length > 80) return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
      update.name = name;
    }
    if (req.body.newPassword) {
      const user = await User.findById(req.user._id);
      if (!(await bcrypt.compare(String(req.body.currentPassword || ''), user.passwordHash))) return res.status(401).json({ message: 'Current password is incorrect.' });
      const np = String(req.body.newPassword);
      if (np.length < 8 || np.length > 128) return res.status(400).json({ message: 'New password must be between 8 and 128 characters.' });
      update.passwordHash = await bcrypt.hash(np, 12);
    }
    if (!Object.keys(update).length) return res.status(400).json({ message: 'Nothing to update.' });
    const saved = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true, runValidators: true });
    res.json({ user: publicUser(saved) });
  } catch (error) { next(error); }
});
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
export default router;

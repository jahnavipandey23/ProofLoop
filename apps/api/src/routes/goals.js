import { Router } from 'express';
import Goal from '../models/Goal.js';
const router = Router();
const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`));

router.get('/', async (req, res, next) => {
  try { const goals = await Goal.find({ user: req.user._id }).sort({ date: -1 }).lean(); res.json({ goals }); }
  catch (error) { next(error); }
});
router.post('/', async (req, res, next) => {
  try {
    const date = String(req.body.date || '');
    const title = String(req.body.title || '').trim();
    if (!validDate(date)) return res.status(400).json({ message: 'Choose a valid date.' });
    if (!title || title.length > 200) return res.status(400).json({ message: 'Goal must be between 1 and 200 characters.' });
    const goal = await Goal.findOneAndUpdate({ user: req.user._id, date }, { $set: { title } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
    res.json({ goal });
  } catch (error) { next(error); }
});
router.delete('/:date', async (req, res, next) => {
  try {
    if (!validDate(req.params.date)) return res.status(400).json({ message: 'Choose a valid date.' });
    const result = await Goal.deleteOne({ user: req.user._id, date: req.params.date });
    res.json({ deleted: result.deletedCount > 0 });
  } catch (error) { next(error); }
});
export default router;

import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Proof from '../models/Proof.js';
import Goal from '../models/Goal.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.doc', '.docx', '.txt']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({ storage, limits: { fileSize: Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 10) * 1024 * 1024, files: 1 }, fileFilter: (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.has(ext)) return cb(new Error('Unsupported file type. Use PNG, JPG, WebP, PDF, DOC, DOCX, or TXT.'));
  cb(null, true);
} });
const asClientProof = (doc) => ({ ...doc, id: doc._id.toString() });
// Allow up to UTC+14 so a user's local "today" is never rejected, but block real future days.
const isFutureDate = (d) => d > new Date(Date.now() + 14 * 3600 * 1000).toISOString().slice(0, 10);
const removeFile = (fileUrl) => { if (!fileUrl) return; const p = path.join(uploadDir, path.basename(fileUrl)); if (fs.existsSync(p)) fs.unlinkSync(p); };

router.get('/', async (req, res, next) => {
  try { const proofs = await Proof.find({ user: req.user._id }).sort({ date: -1, createdAt: -1 }).lean(); res.json({ proofs: proofs.map(asClientProof) }); }
  catch (error) { next(error); }
});
router.post('/', upload.single('file'), async (req, res, next) => {
  res.on('finish', () => { if (res.statusCode >= 400 && req.file) removeFile(req.file.filename); });
  try {
    const date = String(req.body.date || '');
    const title = String(req.body.title || '').trim();
    const category = String(req.body.category || 'Learning');
    const proofType = String(req.body.proofType || 'note');
    const proof = String(req.body.proof || '').trim();
    const clientTime = String(req.body.time || '').trim().slice(0, 20);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) { if (req.file) removeFile(req.file.filename); return res.status(400).json({ message: 'Choose a valid date.' }); }
    if (!title || title.length > 200) return res.status(400).json({ message: 'Goal must be between 1 and 200 characters.' });
    if (isFutureDate(date)) return res.status(400).json({ message: 'You can only submit proof for today or past days.' });
    if (!['Learning', 'Project', 'Fitness', 'Reading', 'Other'].includes(category)) return res.status(400).json({ message: 'Choose a valid category.' });
    if (!['image', 'link', 'note', 'file'].includes(proofType)) return res.status(400).json({ message: 'Choose a valid proof type.' });
    if (proofType === 'link') { let url; try { url = new URL(proof); } catch { return res.status(400).json({ message: 'Enter a valid HTTP or HTTPS URL.' }); } if (!['http:', 'https:'].includes(url.protocol)) return res.status(400).json({ message: 'Only HTTP and HTTPS links are allowed.' }); }
    if (proofType === 'note' && !proof) return res.status(400).json({ message: 'Write a short proof note.' });
    if (['image', 'file'].includes(proofType) && !req.file) return res.status(400).json({ message: 'Choose a file to upload.' });
    if (proofType === 'image' && req.file && !['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(req.file.originalname).toLowerCase())) { fs.unlinkSync(req.file.path); return res.status(400).json({ message: 'Upload an image file for image proof.' }); }
    if (proofType === 'file' && req.file && !['.pdf', '.doc', '.docx', '.txt'].includes(path.extname(req.file.originalname).toLowerCase())) { fs.unlinkSync(req.file.path); return res.status(400).json({ message: 'Upload a PDF, DOC, DOCX, or TXT document.' }); }
    const type = category === 'Reading' ? 'book' : category === 'Project' ? 'code' : 'laptop';
    await Goal.findOneAndUpdate({ user: req.user._id, date }, { $set: { title } }, { upsert: true, new: true, runValidators: true });
    const existing = await Proof.findOne({ user: req.user._id, date });
    if (existing?.fileUrl) { const oldPath = path.join(uploadDir, path.basename(existing.fileUrl)); if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); }
    const proofDoc = await Proof.findOneAndUpdate({ user: req.user._id, date }, { $set: 
      {
      title, category, type, proofType, proof: ['link', 'note'].includes(proofType) ? proof : '',
      fileUrl: req.file ? `/uploads/${req.file.filename}` : '', fileName: req.file?.originalname || '',
      time: clientTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    } }, { new: true, upsert: true, runValidators: true });
    res.status(201).json({ proof: asClientProof(proofDoc.toObject()) });
  } catch (error) { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); next(error); }
});
router.get('/:id/file', async (req, res, next) => {
  try {
    const doc = await Proof.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!doc || !doc.fileUrl) return res.status(404).json({ message: 'Proof file not found.' });
    const filename = path.basename(doc.fileUrl);
    const absolute = path.join(uploadDir, filename);
    if (!fs.existsSync(absolute)) return res.status(404).json({ message: 'Uploaded proof file is missing from the server.' });
    res.type(path.extname(filename));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(absolute);
  } catch (error) { next(error); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Proof.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Proof not found.' });
    removeFile(doc.fileUrl);
    res.json({ deleted: true, id: req.params.id });
  } catch (error) { next(error); }
});
export default router;

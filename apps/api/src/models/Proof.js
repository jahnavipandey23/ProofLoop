import mongoose from 'mongoose';
const proofSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: String, enum: ['Learning', 'Project', 'Fitness', 'Reading', 'Other'], default: 'Learning' },
  type: { type: String, enum: ['book', 'code', 'play', 'laptop'], default: 'laptop' },
  proofType: { type: String, enum: ['image', 'link', 'note', 'file'], required: true },
  proof: { type: String, default: '', maxlength: 5000 },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  time: { type: String, required: true },
}, { timestamps: true });
proofSchema.index({ user: 1, date: 1 });
export default mongoose.model('Proof', proofSchema);

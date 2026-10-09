import mongoose from 'mongoose';
const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  title: { type: String, required: true, trim: true, maxlength: 200 },
}, { timestamps: true });
goalSchema.index({ user: 1, date: 1 });
export default mongoose.model('Goal', goalSchema);

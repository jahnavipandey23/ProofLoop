import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. Create apps/api/.env from .env.example.');
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const c = mongoose.connection;
  console.log(`MongoDB connected: ${c.host}:${c.port}/${c.name}  <- open exactly this database in Compass`);
}

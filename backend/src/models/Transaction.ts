import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  id: number;
  date: Date;
  amount: number;
  category: string;
  status: string;
  user_id: string;
  user_profile: string;
}

const TransactionSchema = new Schema<ITransaction>({
  id: { type: Number, required: true, unique: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  status: { type: String, required: true },
  user_id: { type: String, required: true },
  user_profile: { type: String, required: true },
});

// Add indexes for faster filtering and sorting
TransactionSchema.index({ category: 1, status: 1, date: -1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
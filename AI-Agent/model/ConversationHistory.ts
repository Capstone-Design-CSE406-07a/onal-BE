import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface IConversationHistory extends Document {
  googleId: string;
  messages: IMessage[];
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ConversationHistorySchema = new Schema<IConversationHistory>(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

const ConversationHistory: Model<IConversationHistory> = mongoose.model<IConversationHistory>(
  'ConversationHistory',
  ConversationHistorySchema,
  'ConversationHistory',
);

export default ConversationHistory;

import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. 인터페이스 정의 (TypeScript용)
export interface IUser extends Document {
  id: string;
  password: string;
  name: string;
  onboarding: boolean;
  sensivity: string;
  activity_time: string;
  favorite_place: string[];
}

// 2. 스키마 정의 (MongoDB/Mongoose용)
const UserSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true }, // unique: true는 id 중복 방지
  password: { type: String, required: true },
  name: { type: String, required: true },
  onboarding: { type: Boolean, default: false },
  sensivity: { type: String },
  activity_time: { type: String },
  favorite_place: { type: [String] }
});

// 3. 모델 생성 및 내보내기
// 이미 컬렉션이 있다면 세 번째 인자로 컬렉션 이름을 적어주세요. (예: 'User')
const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema, 'User');

export default User;
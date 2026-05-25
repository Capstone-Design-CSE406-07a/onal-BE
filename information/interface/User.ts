import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActivityTime {
  type: string;   // 예: 출근, 퇴근, 운동, 산책
  time: string;   // 예: 06:00
}

export interface IFavoritePlace {
  name: string;   // 장소명 (예: 회사, 학교)
  dong: string;   // 동 이름 (예: 반포동)
  icon: string;   // 집 | 직장 | 학교 | 병원 | 카페
}

export interface IUser extends Document {
  googleId: string;
  name: string;
  email: string;
  onboarding: boolean;
  sensivity: string[];              // 민감군 복수 선택: 일반 | 천식/호흡기 | 영유아동반 | 노인
  activity_time: IActivityTime[];   // 활동 시간대 (최대 5개)
  favorite_place: IFavoritePlace[]; // 관심 장소 (최대 5개)
}

const ActivityTimeSchema = new Schema<IActivityTime>({
  type: { type: String, required: true },
  time: { type: String, required: true },
}, { _id: false });

const FavoritePlaceSchema = new Schema<IFavoritePlace>({
  name: { type: String, required: true },
  dong: { type: String, required: true },
  icon: { type: String, enum: ['집', '직장', '학교', '병원', '카페'], required: true },
}, { _id: false });

const UserSchema: Schema = new Schema({
  googleId:       { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  email:          { type: String, required: true },
  onboarding:     { type: Boolean, default: false },
  sensivity:      { type: [String], default: [] },
  activity_time:  { type: [ActivityTimeSchema], validate: [(v: IActivityTime[]) => v.length <= 5, '최대 5개'] },
  favorite_place: { type: [FavoritePlaceSchema], validate: [(v: IFavoritePlace[]) => v.length <= 5, '최대 5개'] },
});

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema, 'User');

export default User;
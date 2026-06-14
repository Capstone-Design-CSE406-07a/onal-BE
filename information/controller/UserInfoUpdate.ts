import { Request, Response } from 'express';
import User from '../interface/User';

const UPDATABLE_FIELDS = [
  'sensivity',
  'activity_time',
  'favorite_place',
  'felt_temperature_0',
  'felt_temperature_10',
  'felt_temperature_20',
  'felt_temperature_30',
  'water_intake',
  'body_type',
  'age',
  'activity_level',
  'onboarding',
] as const;

export const UserInfoUpdate = async (req: Request, res: Response) => {
  try {
    const sessionUser = req.user as any;
    const googleId = sessionUser?.googleId ?? sessionUser?.id;

    if (!googleId) {
      return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const updates: Record<string, any> = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: '수정할 필드가 없습니다.' });
    }

    const user = await User.findOneAndUpdate(
      { googleId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.status(200).json(user);
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: '서버 에러' });
  }
};

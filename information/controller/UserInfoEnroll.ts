import { Request, Response } from 'express';
import User from '../interface/User';

export const UserInfoEnroll = async (req: Request, res: Response) => {
    try {
        const profile = req.user as any;
        if (!profile) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        const googleId = profile.id ?? profile.googleId;
        const name     = profile.displayName ?? profile.name;
        const email    = profile.emails?.[0]?.value ?? profile.email ?? '';

        if (!googleId) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        // 이미 가입된 유저라면 기존 데이터 반환 (멱등 처리)
        const existingUser = await User.findOne({ googleId });
        if (existingUser) {
            return res.status(200).json(existingUser);
        }

        const {
            sensivity, activity_time, favorite_place,
            felt_temperature_0, felt_temperature_10, felt_temperature_20, felt_temperature_30,
            water_intake, body_type, age, activity_level,
        } = req.body;

        const toInt = (v: any) => (v !== undefined && v !== null ? Math.round(Number(v)) : undefined);

        const newUser = await User.create({
            googleId,
            name,
            email,
            onboarding:     true,
            sensivity:      sensivity      ?? [],
            activity_time:  activity_time  ?? [],
            favorite_place: favorite_place ?? [],
            felt_temperature_0:  toInt(felt_temperature_0),
            felt_temperature_10: toInt(felt_temperature_10),
            felt_temperature_20: toInt(felt_temperature_20),
            felt_temperature_30: toInt(felt_temperature_30),
            water_intake:  toInt(water_intake),
            body_type:     toInt(body_type),
            age:           toInt(age),
            activity_level: toInt(activity_level),
        });

        return res.status(201).json(newUser);
    } catch (error: any) {
        console.error('[UserInfoEnroll] error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: '서버 에러' });
    }
};
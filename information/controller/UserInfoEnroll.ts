import { Request, Response } from 'express';
import User from '../interface/User';

export const UserInfoEnroll = async (req: Request, res: Response) => {
    try {
        const profile = req.user as any;
        if (!profile) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        const googleId = profile.id;
        const name     = profile.displayName;
        const email    = profile.emails?.[0]?.value ?? '';

        const { sensivity, activity_time, favorite_place } = req.body;

        const newUser = await User.create({
            googleId,
            name,
            email,
            onboarding:     true,
            sensivity:      sensivity      ?? [],
            activity_time:  activity_time  ?? [],
            favorite_place: favorite_place ?? [],
        });

        return res.status(201).json(newUser);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(409).json({ message: '이미 가입된 계정입니다.' });
        }
        return res.status(500).json({ message: '서버 에러' });
    }
};
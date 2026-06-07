import { Request, Response } from 'express';
import User from '../interface/User';

export const UserInfoGet = async (req: Request, res: Response) => {
    try {
        const sessionUser = req.user as any;
        const googleId = sessionUser?.googleId       // DB 유저 (enroll 이후)
                      ?? sessionUser?.id             // 미가입 프로필 (세션만 있을 때)
                      ?? req.body?.googleId;         // 레거시: body로 직접 전달

        if (!googleId) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        const user = await User.findOne({ googleId });
        if (!user) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: '서버 에러' });
    }
};
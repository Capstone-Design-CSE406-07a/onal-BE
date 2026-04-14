import { Request, Response } from 'express';
import User from '../interface/User';

// const newUser = await User.create({
//             id: 'user1',
//             password: '123',
//             name: '홍길동',
//             onboarding: false,
//             sensivity: 'high',
//             activity_time: 'evening',
//             favorite_place: ['강남', '역삼']
//         });


export const UserInfoEnroll = async (req: Request, res: Response) => {
    try {
        const newUser = await User.create(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: "서버 에러" });
    }
};
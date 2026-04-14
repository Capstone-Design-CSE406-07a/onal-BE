import { Request, Response } from 'express';
import User from '../interface/User';

export const UserInfoGet = async (req: Request, res: Response) => {
    try {
        const targetUsers = await User.findOne({id:req.body.id});
        return res.status(200).json(targetUsers);
    } catch (error) {
        return res.status(500).json({ message: "서버 에러" });
    }
};
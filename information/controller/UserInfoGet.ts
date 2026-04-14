import { Request, Response } from 'express';
import User from '../interface/User';

export const UserInfoGet = async (req: Request, res: Response) => {
    try {
        const userId = req.params.id
        const targetUsers = await User.find({id:userId});
        res.status(201).json(targetUsers);
    } catch (error) {
        res.status(500).json({ message: "서버 에러" });
    }
};
import { Router } from 'express';
import { UserInfoSend} from './controller/UserInfoSend';

const router = Router();

router.use('/userinfosend', UserInfoSend);

export default router
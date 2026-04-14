import { Router } from 'express';
import { UserInfoEnroll} from './controller/UserInfoEnroll';

const router = Router();

router.use('/userinfoenroll', UserInfoEnroll);

export default router
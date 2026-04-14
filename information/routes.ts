import { Router } from 'express';
import { UserInfoEnroll} from './controller/UserInfoEnroll';
import { UserInfoGet } from './controller/UserInfoGet';

const router = Router();

router.post('/enroll', UserInfoEnroll);
router.get('/get/:id', UserInfoGet);

export default router
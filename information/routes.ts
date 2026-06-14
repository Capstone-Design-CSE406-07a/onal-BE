import { Router } from 'express';
import { UserInfoEnroll } from './controller/UserInfoEnroll';
import { UserInfoGet } from './controller/UserInfoGet';
import { UserInfoUpdate } from './controller/UserInfoUpdate';

const router = Router();

router.post('/enroll', UserInfoEnroll);
router.get('/get', UserInfoGet);
router.put('/update', UserInfoUpdate);

export default router
import { Router } from 'express';
import passport from 'passport';
import {IUser} from '../information/interface/User';


const router = Router();

router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

// 구글 로그인 콜백 라우터
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err: Error | null, user: IUser | false, info: { message: string } | undefined) => {
    if (err) return next(err);

    if (!user) {
      return res.redirect(`http://localhost:5175/login?status=LOGIN_FAIL`);
    }

    // 미가입 유저도 세션을 생성해야 enroll 엔드포인트에서 req.user 사용 가능
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);

      if (info?.message === 'USER_NOT_FOUND') {
        return res.redirect(`http://localhost:5175/login?status=USER_NOT_FOUND`);
      }
      return res.redirect(`http://localhost:5175/login?status=LOGIN_SUCCESS`);
    });
  })(req, res, next);
});

export default router
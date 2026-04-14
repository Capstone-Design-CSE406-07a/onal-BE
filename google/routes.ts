import { Router } from 'express';
import passport from 'passport';
import {IUser} from '../information/interface/User';


const router = Router();

router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

// 구글 로그인 콜백 라우터
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err: Error | null, user : IUser | false, info: { message: string } | undefined) => {
    if (err) return next(err);


    // 가입되지 않은 경우 (Strategy에서 false를 리턴했을 때)
    if (!user) {
      if (info && info.message === 'USER_NOT_FOUND') {
        return res.redirect(`http://localhost:3000/login?status=USER_NOT_FOUND`);
      }
      return res.redirect(`http://localhost:3000/login?status=LOGIN_FAIL`);
    }

    // 로그인 성공 시 세션 저장 및 메인페이지 이동
    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      // 세션 생성이 완료된 후 성공 응답을 보냄
      return res.redirect(`http://localhost:3000/login?status=LOGIN_SUCCESS`);
    });
  })(req, res, next);
});

export default router
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../information/interface/User';

// Passport에 구글 전략을 등록하는 코드
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!, // .env에 저장하세요
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/oauth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      (async () => {
        try {
          // 1. 구글 ID로 이미 가입된 회원인지 확인
          let user = await User.findOne({ id: profile.id });
          // 2. 가입된 회원이 없으면 새로 생성
          if (!user) {
            return done(null, false, { message: 'USER_NOT_FOUND' })
          }
          // 3. 찾았거나 생성한 사용자 정보를 done으로 전달 (이제 세션으로 넘어감)
          return done(null, profile , { message: 'LOGIN_SUCCESS' });
        }
        catch (err) {
          return done(err, false,{ message: 'LOGIN_FAILED' });
        }

      })();
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(null, false); // 유저가 없으면 에러를 내지 말고 false 반환
    }
    done(null, user);
  } catch (err) {
    console.error('Deserialize 에러:', err);
    done(err); // 에러를 넘기면 서버가 죽을 수 있으니 주의
  }
});

export default passport;
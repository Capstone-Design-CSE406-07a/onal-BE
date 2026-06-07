import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../information/interface/User';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/oauth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      (async () => {
        try {
          const user = await User.findOne({ googleId: profile.id });
          if (!user) {
            // 미가입 유저도 profile을 넘겨 세션을 생성 (onboarding에서 req.user 사용 가능)
            return done(null, profile as any, { message: 'USER_NOT_FOUND' });
          }
          return done(null, profile as any, { message: 'LOGIN_SUCCESS' });
        } catch (err) {
          return done(err as Error, false, { message: 'LOGIN_FAILED' });
        }
      })();
    }
  )
);

// 세션에 { googleId, name, email } 저장 (Google profile ID는 MongoDB ObjectId가 아님)
passport.serializeUser((user: any, done) => {
  done(null, {
    googleId: user.id,
    name: user.displayName,
    email: user.emails?.[0]?.value ?? '',
  });
});

passport.deserializeUser(async (data: { googleId: string; name: string; email: string }, done) => {
  try {
    const user = await User.findOne({ googleId: data.googleId });
    if (!user) {
      // 아직 미가입 상태 — enroll 엔드포인트가 쓸 수 있도록 profile 형태로 반환
      return done(null, {
        id: data.googleId,
        displayName: data.name,
        emails: [{ value: data.email }],
      } as any);
    }
    done(null, user);
  } catch (err) {
    done(err as Error);
  }
});

export default passport;
import express, { Request, Response } from 'express'; // import 방식 통일
import Information_Router from './information/routes';
import Oauth_Router from'./google/routes';
import Weather_Router from './get_weather_data/routes'
import { MongoDBConnect } from './MongoDB/MongoDBConnect';
import passport from './config/Passport';
import session from 'express-session';


const app = express();
const port = 3000;

// 1. 미들웨어 설정
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET!, // 세션을 암호화할 키 (임의로 작성)
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // 개발 단계에서는 false, 배포(HTTPS) 시에는 true 권장
}));
app.use(passport.initialize());


// 2. DB 연결
MongoDBConnect();


// 3. 라우터 설정
app.use('/user', Information_Router);
app.use('/oauth',Oauth_Router)
app.use('/getdata',Weather_Router)

app.get('/', (req: Request, res: Response) => {
    res.send("테스트");
});

// 4. app.listen 수정 (인자 없이 콜백만)
app.listen(port, () => {
    console.log(`Server started! http://localhost:${port}`);
});
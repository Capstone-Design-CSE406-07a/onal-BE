import express, { Request, Response } from 'express'; // import 방식 통일
import Information_Router from './information/routes';
import { MongoDBConnect } from './MongoDB/MongoDBConnect';


const app = express();
const port = 3000;

// 1. 미들웨어 먼저 설정
app.use(express.json());

// 2. DB 연결
MongoDBConnect();


// 3. 라우터 설정
app.use('/user', Information_Router);

app.get('/', (req: Request, res: Response) => {
    res.send("테스트");
});

// 4. app.listen 수정 (인자 없이 콜백만)
app.listen(port, () => {
    console.log(`Server started! http://localhost:${port}`);
});
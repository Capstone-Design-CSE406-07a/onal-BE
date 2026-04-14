const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB URI (실제 서비스 시에는 환경변수 .env에 저장하세요)
const dbURI = process.env.MONGO_DB_URI

export const MongoDBConnect = async () => {
  try {
    await mongoose.connect(dbURI);
    console.log('MongoDB 연결 성공!');
  } catch (err : any) {
    console.error('MongoDB 연결 실패:', err.message);
    process.exit(1); // 연결 실패 시 프로세스 종료
  }
};

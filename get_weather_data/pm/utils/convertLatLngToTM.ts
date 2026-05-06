// utils/convertLatLngToTM.ts
import axios from 'axios';

export async function convertLatLngToTM(lat: number, lng: number, apiKey: string): Promise<{ tmX: number; tmY: number }> {
  const url = `http://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getTMStdrCrdnt?serviceKey=${apiKey}&returnType=json&numOfRows=1&pageNo=1&umdName=혜화동`;

  const axiosRes = await axios.get(url);
  console.log('API 응답 결과:', JSON.stringify(axiosRes.data, null, 2)); // 데이터 구조 확인
  const item = axiosRes.data.response.body.items[0];

  return {
    tmX: Number(item.tmX),
    tmY: Number(item.tmY),
  };
}
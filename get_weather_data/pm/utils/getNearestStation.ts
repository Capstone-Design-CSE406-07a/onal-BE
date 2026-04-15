// utils/getNearestStation.ts
import axios from 'axios';

export async function getNearestStation(tmX: number, tmY: number, apiKey: string): Promise<string> {
  const url = `http://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getNearbyMsrstnList?serviceKey=${apiKey}&returnType=json&numOfRows=1&pageNo=1&tmX=${tmX}&tmY=${tmY}&ver=1.0`;

  const axiosRes = await axios.get(url);
  const item = axiosRes.data.response.body.items[0];

  return item.stationName; // 가장 가까운 측정소 이름
}
// controller/Get_AirQuality_Data.ts
import axios from 'axios';
import proj4 from 'proj4';
import { Request, Response } from 'express';
import { convertLatLngToTM } from '../utils/convertLatLngToTM';
import { getNearestStation } from '../utils/getNearestStation';

interface AirQualityResult {
  미세먼지: string;   // PM10
  초미세먼지: string; // PM2.5
  통합대기환경지수: string;
  측정시간: string;
}

proj4.defs("EPSG:5181", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs");
// EPSG:4326: WGS84 (일반 위도/경도)
// EPSG:5181: 중부원점 GRS80 (한국의 TM 좌표계)
const wgs84 = 'EPSG:4326';
const tmKorea = 'EPSG:5181';


export async function Get_Pm_Data(req: Request, res: Response): Promise<void> {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat, lng는 숫자여야 합니다.' });
    return;
  }
  const apiKey = process.env.WEATHER_API_KEY!;

  const result = await getAirQuality(lat,lng, apiKey);
  console.log(result)
  res.json(result);
}

export async function getAirQuality(lat: number, lng:number, apiKey: string): Promise<AirQualityResult> {
  const [tmX, tmY] = proj4(wgs84, tmKorea, [lng, lat]);
  const stationName = await getNearestStation(tmX, tmY, apiKey);
  const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${apiKey}&returnType=json&numOfRows=1&pageNo=1&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&ver=1.0`;

  const axiosRes = await axios.get(url);
  const item = axiosRes.data.response.body.items[0];

  return {
    미세먼지: `${item.pm10Value}㎍/㎥`,
    초미세먼지: `${item.pm25Value}㎍/㎥`,
    통합대기환경지수: item.khaiGrade, // 1:좋음 2:보통 3:나쁨 4:매우나쁨
    측정시간: item.dataTime,
  };
}
// controller/Get_AirQuality_Data.ts
import axios from 'axios';
import proj4 from 'proj4';
import { Request, Response } from 'express';
import { convertLatLngToTM } from '../utils/convertLatLngToTM';
import { getNearestStation } from '../utils/getNearestStation';
import { mappingData } from '../../Kma_Area_mapping';
import { distanceKm } from '../../utils/distanceKm';

interface AirQualityResult {
  미세먼지: string;   // PM10
  초미세먼지: string; // PM2.5
  통합대기환경지수: string;
  측정시간: string;
}

interface AirQualityNationwideResult extends AirQualityResult {
  sido: string;
  sigungu: string;
  dong: string;
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

export async function Get_Pm_Nationwide(_req: Request, res: Response): Promise<void> {
  const apiKey = process.env.WEATHER_API_KEY!;
  const results = await getAirQualityNationwide(apiKey);
  res.json(results);
}

export async function getAirQualityNationwide(apiKey: string): Promise<AirQualityNationwideResult[]> {
  // Phase 1: 모든 동의 가장 가까운 측정소를 병렬로 조회
  const stationLookups = await Promise.allSettled(
    mappingData.map(async (rep) => {
      const [tmX, tmY] = proj4(wgs84, tmKorea, [rep.lon, rep.lat]);
      const stationName = await getNearestStation(tmX, tmY, apiKey);
      return { sido: rep.sido, sigungu: rep.sigungu, dong: rep.dong, stationName };
    })
  );

  const dongStations = stationLookups
    .filter((r): r is PromiseFulfilledResult<{ sido: string; sigungu: string; dong: string; stationName: string }> => r.status === 'fulfilled')
    .map(r => r.value);

  // Phase 2: 중복 측정소 제거 후 데이터 조회
  const uniqueStations = [...new Set(dongStations.map(d => d.stationName))];
  const stationDataResults = await Promise.allSettled(
    uniqueStations.map(async (stationName) => {
      const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${apiKey}&returnType=json&numOfRows=1&pageNo=1&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&ver=1.0`;
      const axiosRes = await axios.get(url);
      const item = axiosRes.data.response.body.items[0];
      return {
        stationName,
        미세먼지: `${item.pm10Value}㎍/㎥`,
        초미세먼지: `${item.pm25Value}㎍/㎥`,
        통합대기환경지수: item.khaiGrade,
        측정시간: item.dataTime,
      };
    })
  );

  const stationDataMap = new Map<string, AirQualityResult>();
  stationDataResults
    .filter((r): r is PromiseFulfilledResult<{ stationName: string } & AirQualityResult> => r.status === 'fulfilled')
    .forEach(r => {
      const { stationName, ...data } = r.value;
      stationDataMap.set(stationName, data);
    });

  // Phase 3: 각 동에 측정소 데이터 매핑
  return dongStations
    .filter(d => stationDataMap.has(d.stationName))
    .map(d => ({
      sido: d.sido,
      sigungu: d.sigungu,
      dong: d.dong,
      ...stationDataMap.get(d.stationName)!,
    }));
}

export async function Get_Pm_Nearby(req: Request, res: Response): Promise<void> {
  const { dong } = req.query;
  if (!dong) {
    res.status(400).json({ error: 'dong은 필수입니다.' });
    return;
  }
  const region = mappingData.find(r => r.dong === String(dong));
  if (!region) {
    res.status(404).json({ error: '해당 동을 찾을 수 없습니다.' });
    return;
  }
  const apiKey = process.env.WEATHER_API_KEY!;
  const results = await getAirQualityNearby(region.areaNo, 5, apiKey);
  res.json(results);
}

export async function getAirQualityNearby(areaNo: string, radiusKm: number, apiKey: string): Promise<(AirQualityNationwideResult & { areaNo: string; distance: number })[] | null> {
  const center = mappingData.find(r => r.areaNo === areaNo);
  if (!center) return null;

  const nearby = mappingData
    .map(r => ({ ...r, distance: distanceKm(center.lat, center.lon, r.lat, r.lon) }))
    .filter(r => r.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  const stationLookups = await Promise.allSettled(
    nearby.map(async r => {
      const [tmX, tmY] = proj4(wgs84, tmKorea, [r.lon, r.lat]);
      const stationName = await getNearestStation(tmX, tmY, apiKey);
      return { areaNo: r.areaNo, sido: r.sido, sigungu: r.sigungu, dong: r.dong, distance: r.distance, stationName };
    })
  );

  const dongStations = stationLookups
    .filter((r): r is PromiseFulfilledResult<{ areaNo: string; sido: string; sigungu: string; dong: string; distance: number; stationName: string }> => r.status === 'fulfilled')
    .map(r => r.value);

  const uniqueStations = [...new Set(dongStations.map(d => d.stationName))];
  const stationDataResults = await Promise.allSettled(
    uniqueStations.map(async stationName => {
      const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${apiKey}&returnType=json&numOfRows=1&pageNo=1&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&ver=1.0`;
      const axiosRes = await axios.get(url);
      const item = axiosRes.data.response.body.items[0];
      return {
        stationName,
        미세먼지: `${item.pm10Value}㎍/㎥`,
        초미세먼지: `${item.pm25Value}㎍/㎥`,
        통합대기환경지수: item.khaiGrade,
        측정시간: item.dataTime,
      };
    })
  );

  const stationDataMap = new Map<string, AirQualityResult>();
  stationDataResults
    .filter((r): r is PromiseFulfilledResult<{ stationName: string } & AirQualityResult> => r.status === 'fulfilled')
    .forEach(r => {
      const { stationName, ...data } = r.value;
      stationDataMap.set(stationName, data);
    });

  return dongStations
    .filter(d => stationDataMap.has(d.stationName))
    .map(d => ({
      sido: d.sido,
      sigungu: d.sigungu,
      dong: d.dong,
      areaNo: d.areaNo,
      distance: Math.round(d.distance * 10) / 10,
      ...stationDataMap.get(d.stationName)!,
    }));
}
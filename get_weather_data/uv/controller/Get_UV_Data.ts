
import { Request, Response } from 'express';
import axios from 'axios';
import { findNearestRegion } from '../utils/findNearestRegion';
import { findNearestUVIndex } from '../utils/findNearestUVIndex';
import { mappingData } from '../../Kma_Area_mapping';
import { distanceKm } from '../../utils/distanceKm';

export async function Get_UV_Data(_req: Request, res: Response) {


  try {
    const data = await getUvIndex();
    console.log(data)
    return res.status(200).json({uv : data});
  } catch (e) {
    return res.status(500).json({ message: `자외선 API 호출 실패` });
  }
}

// uvIndex.service.ts


const BASE_URL = 'http://apis.data.go.kr/1360000/LivingWthrIdxServiceV4/getUVIdxV4';

export async function getUvIndex() {
  const time = getBaseTime(new Date());
  const location = findNearestRegion(37.2636,127.0286);
  console.log(location)
  const { data } = await axios.get(BASE_URL, {
    params: {
      serviceKey: process.env.WEATHER_API_KEY!,
      numOfRows: 10,
      pageNo: 1,
      dataType: 'JSON',
      areaNo : location.areaNo,
      time,
    },
  });

  const items = data?.response?.body?.items?.item;
  if (!items) throw new Error('데이터 없음');

  const score = findNearestUVIndex(items)

  return score;
}

function getBaseTime(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}06`;
}

export async function getUvIndexForLocation(lat: number, lon: number): Promise<number> {
  const time = getBaseTime(new Date());
  const location = findNearestRegion(lat, lon);
  const { data } = await axios.get(BASE_URL, {
    params: {
      serviceKey: process.env.WEATHER_API_KEY!,
      numOfRows: 10,
      pageNo: 1,
      dataType: 'JSON',
      areaNo: location.areaNo,
      time,
    },
  });

  const items = data?.response?.body?.items?.item;
  if (!items) throw new Error('데이터 없음');

  return findNearestUVIndex(items);
}

export async function Get_UV_Nationwide(_req: Request, res: Response) {
  try {
    const results = await getUvIndexNationwide();
    return res.status(200).json(results);
  } catch (e) {
    return res.status(500).json({ message: '전국 자외선 API 호출 실패' });
  }
}

export async function getUvIndexNationwide(): Promise<{ sido: string; sigungu: string; dong: string; uv: number }[]> {
  const time = getBaseTime(new Date());

  const settled = await Promise.allSettled(
    mappingData.map(async (rep) => {
      const { data } = await axios.get(BASE_URL, {
        params: {
          serviceKey: process.env.WEATHER_API_KEY!,
          numOfRows: 10,
          pageNo: 1,
          dataType: 'JSON',
          areaNo: rep.areaNo,
          time,
        },
      });
      const items = data?.response?.body?.items?.item;
      if (!items) throw new Error('데이터 없음');
      const uv = findNearestUVIndex(items);
      return { sido: rep.sido, sigungu: rep.sigungu, dong: rep.dong, uv };
    })
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<{ sido: string; sigungu: string; dong: string; uv: number }> => r.status === 'fulfilled')
    .map(r => r.value);
}

export async function Get_UV_Nearby(req: Request, res: Response) {
  const { areaNo, radius } = req.query;
  if (!areaNo) {
    return res.status(400).json({ error: 'areaNo는 필수입니다.' });
  }
  const results = await getUvIndexNearby(String(areaNo), Number(radius) || 20);
  if (!results) {
    return res.status(404).json({ error: '해당 areaNo를 찾을 수 없습니다.' });
  }
  return res.json(results);
}

export async function getUvIndexNearby(areaNo: string, radiusKm: number): Promise<{ sido: string; sigungu: string; dong: string; areaNo: string; distance: number; uv: number }[] | null> {
  const center = mappingData.find(r => r.areaNo === areaNo);
  if (!center) return null;

  const nearby = mappingData
    .map(r => ({ ...r, distance: distanceKm(center.lat, center.lon, r.lat, r.lon) }))
    .filter(r => r.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  const time = getBaseTime(new Date());

  const settled = await Promise.allSettled(
    nearby.map(async r => {
      const { data } = await axios.get(BASE_URL, {
        params: { serviceKey: process.env.WEATHER_API_KEY!, numOfRows: 10, pageNo: 1, dataType: 'JSON', areaNo: r.areaNo, time },
      });
      const items = data?.response?.body?.items?.item;
      if (!items) throw new Error('데이터 없음');
      return {
        sido: r.sido,
        sigungu: r.sigungu,
        dong: r.dong,
        areaNo: r.areaNo,
        distance: Math.round(r.distance * 10) / 10,
        uv: findNearestUVIndex(items),
      };
    })
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<{ sido: string; sigungu: string; dong: string; areaNo: string; distance: number; uv: number }> => r.status === 'fulfilled')
    .map(r => r.value);
}
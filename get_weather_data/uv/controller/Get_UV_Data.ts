
import { Request, Response } from 'express';
import axios from 'axios';
import { findNearestRegion } from '../utils/findNearestRegion';
import { findNearestUVIndex } from '../utils/findNearestUVIndex';

export async function Get_UV_Data(req: Request, res: Response) {


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
  const areaNo = 1
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
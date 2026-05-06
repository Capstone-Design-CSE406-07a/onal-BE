import axios, { AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { getBaseTime } from '../utils/getBaseTime';
import { convertLatLngToNxNy } from '../utils/convertLatLngToNxNy';

interface WeatherItem {
  category: string;
  obsrValue: string;
}

interface WeatherResult {
  기온: string;
  풍속: string;
  풍향: string;
  습도: string;
  '1시간강수량': string;
  강수형태: string;
}

interface WeatherResponse {
  result: WeatherResult;
  raw: AxiosResponse;
}

const CATEGORY_MAP: Record<string, { name: keyof WeatherResult; unit: string }> = {
  T1H: { name: '기온',        unit: '°C' },
  WSD: { name: '풍속',        unit: 'm/s' },
  VEC: { name: '풍향',        unit: 'deg' },
  REH: { name: '습도',        unit: '%' },
  RN1: { name: '1시간강수량', unit: 'mm' },
  PTY: { name: '강수형태',    unit: '' },
};


const a1 = 37.2636
const a2 = 127.0286
export async function Get_Temperture_Wind_Data(req: Request, res: Response): Promise<void> {

  const {nx , ny} = convertLatLngToNxNy(a1,a2);
  console.log(nx,ny)
  
  const apiKey = process.env.WEATHER_API_KEY!;

  const weatherResult = await getWeather(Number(nx), Number(ny), apiKey);
  console.log(weatherResult)
  res.json(weatherResult);
}

// 순수 데이터 함수 (다른 곳에서 재사용 가능)
export async function getWeather(nx: number, ny: number, apiKey: string): Promise<WeatherResult> {
  const { baseDate, baseTime } = getBaseTime();
  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?ServiceKey=${apiKey}&pageNo=1&numOfRows=10&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
  console.log(url)
  const axiosRes = await axios.get(url);

  const items: WeatherItem[] = axiosRes.data.response.body.items.item;

  return items.reduce<Partial<WeatherResult>>((acc, item) => {
    const meta = CATEGORY_MAP[item.category];
    if (meta) acc[meta.name] = `${item.obsrValue}${meta.unit}`;
    return acc;
  }, {}) as WeatherResult;
}
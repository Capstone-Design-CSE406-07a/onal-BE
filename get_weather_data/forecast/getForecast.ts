import axios from 'axios';
import { mappingData } from '../Kma_Area_mapping';
import { convertLatLngToNxNy } from '../temperture_wind/utils/convertLatLngToNxNy';

export interface ForecastResult {
  targetTime: string;   // 예: "2026-05-27 18:00"
  기온: string;
  하늘상태: string;
  강수형태: string;
  강수확률?: string;    // 단기예보만 제공
  습도: string;
  풍속: string;
}

const SKY_MAP: Record<string, string> = {
  '1': '맑음',
  '3': '구름많음',
  '4': '흐림',
};

const PTY_MAP: Record<string, string> = {
  '0': '없음',
  '1': '비',
  '2': '비/눈',
  '3': '눈',
  '5': '빗방울',
  '6': '빗방울/눈날림',
  '7': '눈날림',
};

// 초단기예보 base time (30분 단위, 현재 기준 -30분)
function getUltraShortBaseTime(): { baseDate: string; baseTime: string } {
  const now = new Date();
  now.setMinutes(now.getMinutes() - 30);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = now.getMinutes() >= 30 ? '30' : '00';

  return { baseDate: `${year}${month}${day}`, baseTime: `${hour}${minute}` };
}

// 단기예보 base time (0200/0500/0800/1100/1400/1700/2000/2300)
function getShortForecastBaseTime(): { baseDate: string; baseTime: string } {
  const baseTimes = [200, 500, 800, 1100, 1400, 1700, 2000, 2300];
  const now = new Date();
  now.setMinutes(now.getMinutes() - 10);

  const current = now.getHours() * 100 + now.getMinutes();
  let baseTime = '2300';

  for (const bt of baseTimes) {
    if (current >= bt) baseTime = String(bt).padStart(4, '0');
  }

  // 자정 이후 0200 이전이면 전날 2300 기준
  if (current < 200) {
    now.setDate(now.getDate() - 1);
    baseTime = '2300';
  }

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return { baseDate: `${year}${month}${day}`, baseTime };
}

// 목표 시간 계산
function getTargetDateTime(targetHour: number): { fcstDate: string; fcstTime: string; label: string } {
  const target = new Date();
  target.setHours(target.getHours() + targetHour, 0, 0, 0);

  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  const hour = String(target.getHours()).padStart(2, '0');

  return {
    fcstDate: `${year}${month}${day}`,
    fcstTime: `${hour}00`,
    label: `${year}-${month}-${day} ${hour}:00`,
  };
}

// 초단기예보 (6시간 이내)
async function getUltraShortForecast(nx: number, ny: number, apiKey: string, targetHour: number): Promise<ForecastResult> {
  const { baseDate, baseTime } = getUltraShortBaseTime();
  const { fcstDate, fcstTime, label } = getTargetDateTime(targetHour);

  const { data } = await axios.get(
    'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst',
    {
      params: {
        serviceKey: apiKey,
        numOfRows: 100,
        pageNo: 1,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx,
        ny,
      },
    },
  );

  const items: { category: string; fcstDate: string; fcstTime: string; fcstValue: string }[] =
    data?.response?.body?.items?.item ?? [];

  const target = items.filter((i) => i.fcstDate === fcstDate && i.fcstTime === fcstTime);
  const get = (cat: string) => target.find((i) => i.category === cat)?.fcstValue ?? '-';

  return {
    targetTime: label,
    기온: `${get('T1H')}°C`,
    하늘상태: SKY_MAP[get('SKY')] ?? get('SKY'),
    강수형태: PTY_MAP[get('PTY')] ?? get('PTY'),
    습도: `${get('REH')}%`,
    풍속: `${get('WSD')}m/s`,
  };
}

// 단기예보 (6시간 초과 ~ 72시간)
async function getShortForecast(nx: number, ny: number, apiKey: string, targetHour: number): Promise<ForecastResult> {
  const { baseDate, baseTime } = getShortForecastBaseTime();
  const { fcstDate, fcstTime, label } = getTargetDateTime(targetHour);

  const { data } = await axios.get(
    'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst',
    {
      params: {
        serviceKey: apiKey,
        numOfRows: 300,
        pageNo: 1,
        dataType: 'JSON',
        base_date: baseDate,
        base_time: baseTime,
        nx,
        ny,
      },
    },
  );

  const items: { category: string; fcstDate: string; fcstTime: string; fcstValue: string }[] =
    data?.response?.body?.items?.item ?? [];

  const target = items.filter((i) => i.fcstDate === fcstDate && i.fcstTime === fcstTime);
  const get = (cat: string) => target.find((i) => i.category === cat)?.fcstValue ?? '-';

  return {
    targetTime: label,
    기온: `${get('TMP')}°C`,
    하늘상태: SKY_MAP[get('SKY')] ?? get('SKY'),
    강수형태: PTY_MAP[get('PTY')] ?? get('PTY'),
    강수확률: `${get('POP')}%`,
    습도: `${get('REH')}%`,
    풍속: `${get('WSD')}m/s`,
  };
}

// 외부에서 호출하는 함수
export async function getForecastForDong(dong: string, targetHour: number): Promise<ForecastResult> {
  const area = mappingData.find(
    (r) => r.dong === dong || r.dong.includes(dong) || dong.includes(r.dong),
  );
  if (!area) throw new Error(`동을 찾을 수 없습니다: ${dong}`);

  const { nx, ny } = convertLatLngToNxNy(area.lat, area.lon);
  const apiKey = process.env.WEATHER_API_KEY!;

  if (targetHour <= 6) {
    return getUltraShortForecast(nx, ny, apiKey, targetHour);
  } else if (targetHour <= 72) {
    return getShortForecast(nx, ny, apiKey, targetHour);
  } else {
    throw new Error('최대 72시간(3일) 이내 예보만 지원합니다.');
  }
}

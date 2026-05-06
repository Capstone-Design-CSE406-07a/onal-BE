import { Request, Response } from 'express';
import axios from 'axios';
import User from '../../information/interface/User';
import { getWeather } from '../../get_weather_data/temperture_wind/controller/Get_Temperture_Wind_Data';
import { getAirQuality } from '../../get_weather_data/pm/controller/Get_Pm_Data';
import { getUvIndex } from '../../get_weather_data/uv/controller/Get_UV_Data';
import { convertLatLngToNxNy } from '../../get_weather_data/temperture_wind/utils/convertLatLngToNxNy';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function AiResponse(req: Request, res: Response): Promise<void> {
  try {
    const { id, prompt, lat, lng } = req.body;

    if (!id || !prompt) {
      res.status(400).json({ error: 'id와 prompt는 필수입니다.' });
      return;
    }

    const user = await User.findOne({ id});
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    const apiKey = process.env.WEATHER_API_KEY!;
    let weatherSection = '';

    if (lat != null && lng != null) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      const { nx, ny } = convertLatLngToNxNy(latNum, lngNum);

      const [tempWind, airQuality, uvIndex] = await Promise.all([
        getWeather(nx, ny, apiKey),
        getAirQuality(latNum, lngNum, apiKey),
        getUvIndex(),
      ]);

      weatherSection = `
[현재 환경 데이터]
- 기온: ${tempWind.기온}
- 풍속: ${tempWind.풍속}
- 습도: ${tempWind.습도}
- 강수형태: ${tempWind.강수형태}
- 미세먼지(PM10): ${airQuality.미세먼지}
- 초미세먼지(PM2.5): ${airQuality.초미세먼지}
- 통합대기환경지수: ${airQuality.통합대기환경지수}
- 자외선 지수: ${uvIndex}`;
    }

    const systemPrompt = `당신은 개인 환경 건강 어시스턴트입니다. 사용자의 건강 민감도와 현재 환경 데이터를 바탕으로 구체적인 행동 가이드를 제공하세요.

[유저 정보]
- 이름: ${user.name}
- 건강 민감도: ${user.sensivity}
- 주요 활동 시간대: ${user.activity_time}
- 즐겨찾는 장소: ${user.favorite_place.join(', ')}
${weatherSection}

위 정보를 바탕으로 사용자 질문에 개인화된 행동 가이드를 제공하세요. 답변은 명확하고 실용적인 행동 지침으로 구성해 주세요.`;

    const geminiKey = process.env.GEMINI_API_KEY!;
    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        { role: 'user', parts: [{ text: String(prompt) }] },
      ],
    };

    let geminiRes;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        geminiRes = await axios.post(`${GEMINI_API_URL}?key=${geminiKey}`, requestBody);
        break;
      } catch (err: any) {
        if (err?.response?.status === 429 && attempt < maxRetries) {
          const delay = attempt * 2000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }

    const answer = geminiRes!.data.candidates[0].content.parts[0].text;
    res.json({ answer });
  } catch (error: any) {
    console.error('AI 응답 오류:', error?.response?.data ?? error?.message ?? error);
    if (error?.response?.status === 429) {
      res.status(429).json({ error: 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
      return;
    }
    res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
  }
}

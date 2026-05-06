import { Request, Response } from 'express';
import Groq from 'groq-sdk';
import { getWeather } from '../../get_weather_data/temperture_wind/controller/Get_Temperture_Wind_Data';
import { getAirQuality } from '../../get_weather_data/pm/controller/Get_Pm_Data';
import { getUvIndex } from '../../get_weather_data/uv/controller/Get_UV_Data';
import { convertLatLngToNxNy } from '../../get_weather_data/temperture_wind/utils/convertLatLngToNxNy';
import dotenv from 'dotenv';

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GroqResponse(req: Request, res: Response): Promise<void> {
  try {
    const { id, prompt, lat, lng } = req.query;

    if (!id || !prompt) {
      res.status(400).json({ error: 'id와 prompt는 필수입니다.' });
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
- 이름: ${"김승원"}
- 건강 민감도: ${"천식환자"}
- 주요 활동 시간대: ${"낮"}
- 즐겨찾는 장소: ${["경기 용인시 기흥구 서천동"].join(', ')}
${weatherSection}

위 정보를 바탕으로 사용자 질문에 개인화된 행동 가이드를 제공하세요. 답변은 명확하고 실용적인 행동 지침으로 구성해 주세요.`;

    const chatCompletion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: String(prompt) },
      ],
    });

    const answer = chatCompletion.choices[0].message.content;
    res.json({ answer });
  } catch (error: any) {
    console.error('Groq AI 응답 오류:', error?.message ?? error);
    res.status(500).json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' });
  }
}

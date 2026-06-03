import { Request, Response } from 'express';
import OpenAI from 'openai';
import User from '../../information/interface/User';
import ConversationHistory from '../model/ConversationHistory';
import { getWeather } from '../../get_weather_data/temperture_wind/controller/Get_Temperture_Wind_Data';
import { getAirQuality } from '../../get_weather_data/pm/controller/Get_Pm_Data';
import { getUvIndexForLocation } from '../../get_weather_data/uv/controller/Get_UV_Data';
import { getForecastForDong } from '../../get_weather_data/forecast/getForecast';
import { mappingData } from '../../get_weather_data/Kma_Area_mapping';
import { convertLatLngToNxNy } from '../../get_weather_data/temperture_wind/utils/convertLatLngToNxNy';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_ITERATIONS = 5;
const MAX_HISTORY = 20; // 최근 20개 메시지(10회 대화) 유지

// 도구 정의
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '특정 동의 현재 기온, 풍속, 습도, 강수형태를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          dong: { type: 'string', description: '조회할 동 이름 (예: 강남동, 반포동)' },
        },
        required: ['dong'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_air_quality',
      description: '특정 동의 미세먼지(PM10), 초미세먼지(PM2.5), 통합대기환경지수를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          dong: { type: 'string', description: '조회할 동 이름 (예: 강남동, 반포동)' },
        },
        required: ['dong'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_uv_index',
      description: '특정 동의 자외선 지수를 조회합니다.',
      parameters: {
        type: 'object',
        properties: {
          dong: { type: 'string', description: '조회할 동 이름 (예: 강남동, 반포동)' },
        },
        required: ['dong'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_favorite_places',
      description: '사용자의 즐겨찾는 장소 목록(이름, 동, 아이콘)을 조회합니다.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_forecast',
      description: '특정 동의 미래 날씨 예보를 조회합니다. 6시간 이내는 초단기예보, 초과 시 단기예보(최대 72시간)를 사용합니다.',
      parameters: {
        type: 'object',
        properties: {
          dong: { type: 'string', description: '조회할 동 이름 (예: 역삼동)' },
          target_hour: {
            type: 'number',
            description: '지금으로부터 몇 시간 후인지 (예: 3 → 3시간 후, 24 → 내일 이 시간)',
          },
        },
        required: ['dong', 'target_hour'],
      },
    },
  },
];

// dong 이름으로 매핑 데이터 조회
function resolveLocation(dong: string) {
  const match = mappingData.find(
    (r) => r.dong === dong || r.dong.includes(dong) || dong.includes(r.dong),
  );
  if (!match) throw new Error(`동을 찾을 수 없습니다: ${dong}`);
  return match;
}

// 도구 실행
async function executeTool(name: string, args: Record<string, any>, googleId: string) {
  const apiKey = process.env.WEATHER_API_KEY!;

  if (name === 'get_weather') {
    const area = resolveLocation(args.dong);
    const { nx, ny } = convertLatLngToNxNy(area.lat, area.lon);
    return await getWeather(nx, ny, apiKey);
  }

  if (name === 'get_air_quality') {
    const area = resolveLocation(args.dong);
    return await getAirQuality(area.lat, area.lon, apiKey);
  }

  if (name === 'get_uv_index') {
    const area = resolveLocation(args.dong);
    const uv = await getUvIndexForLocation(area.lat, area.lon);
    return { 자외선지수: uv };
  }

  if (name === 'get_user_favorite_places') {
    const user = await User.findOne({ googleId });
    return { favorite_places: user?.favorite_place ?? [] };
  }

  if (name === 'get_forecast') {
    return await getForecastForDong(args.dong, Number(args.target_hour));
  }

  throw new Error(`알 수 없는 도구: ${name}`);
}

export async function AgentResponse(req: Request, res: Response): Promise<void> {
  try {
    const { prompt } = req.body;
    const sessionUser = req.user as any;

    if (!sessionUser?.googleId) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }

    const googleId = sessionUser.googleId;

    if (!prompt) {
      res.status(400).json({ error: 'prompt는 필수입니다.' });
      return;
    }
    const user = await User.findOne({ googleId });
    if (!user) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      return;
    }

    const now = new Date();
    const currentTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    const systemPrompt = `당신은 개인 환경 건강 어시스턴트입니다. 제공된 도구를 사용해 필요한 환경 데이터를 직접 조회하고, 사용자의 건강 민감도에 맞는 행동 가이드를 제공하세요.

[현재 시각]
${currentTime}

[유저 정보]
- 이름: ${user.name}
- 건강 민감도: ${user.sensivity.join(', ')}
- 주요 활동 시간대: ${user.activity_time.map((a) => `${a.type} ${a.time}`).join(', ')}
- 즐겨찾는 장소: ${user.favorite_place.map((p) => `${p.name}(${p.dong})`).join(', ')}

도구를 적극적으로 활용하여 정확한 데이터 기반의 답변을 제공하세요. 여러 장소를 비교해야 할 때는 각 장소별로 도구를 호출하세요.
"오늘 저녁 6시", "내일 오전 10시" 같은 절대 시각 표현은 현재 시각을 기준으로 target_hour를 직접 계산하여 get_forecast를 호출하세요.`;

    // 대화 이력 불러오기
    const history = await ConversationHistory.findOne({ googleId });
    const pastMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
      (history?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...pastMessages,
      { role: 'user', content: String(prompt) },
    ];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools,
        tool_choice: 'auto',
      });

      const message = response.choices[0].message;
      messages.push(message);

      // 도구 호출 없이 텍스트 응답 → 최종 답변, 이력 저장
      if (!message.tool_calls || message.tool_calls.length === 0) {
        const answer = message.content ?? '';

        const newMessages = [
          ...(history?.messages ?? []),
          { role: 'user' as const, content: String(prompt), createdAt: new Date() },
          { role: 'assistant' as const, content: answer, createdAt: new Date() },
        ].slice(-MAX_HISTORY); // 최근 MAX_HISTORY개만 유지

        await ConversationHistory.findOneAndUpdate(
          { googleId },
          { messages: newMessages },
          { upsert: true, new: true },
        );

        res.json({ answer });
        return;
      }

      // 도구 호출 실행 (병렬)
      const toolCalls = message.tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[];
      const toolResults = await Promise.allSettled(
        toolCalls.map(async (toolCall) => {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeTool(toolCall.function.name, args, googleId);
          return { toolCall, result };
        }),
      );

      for (const settled of toolResults) {
        if (settled.status === 'fulfilled') {
          const { toolCall, result } = settled.value;
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } else {
          // 도구 실패 시 에러 내용을 AI에게 전달
          const toolCall = toolCalls[toolResults.indexOf(settled)];
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: settled.reason?.message ?? '도구 호출 실패' }),
          });
        }
      }
    }

    res.status(500).json({ error: '최대 반복 횟수를 초과했습니다.' });
  } catch (error: any) {
    console.error('Agent 응답 오류:', error?.response?.data ?? error?.message ?? error);
    res.status(500).json({ error: 'AI 에이전트 응답 중 오류가 발생했습니다.' });
  }
}

export async function ClearHistory(req: Request, res: Response): Promise<void> {
  try {
    const sessionUser = req.user as any;
    if (!sessionUser?.googleId) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    await ConversationHistory.deleteOne({ googleId: sessionUser.googleId });
    res.json({ message: '대화 이력이 초기화되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ error: '이력 초기화 중 오류가 발생했습니다.' });
  }
}

# 에이전틱 워크플로우 (Agentic Workflow)

**과목명**: 캡스톤디자인  
**프로젝트**: onal — 개인 맞춤 환경 건강 가이드 서비스  
**작성일**: 2026-05-25

---

## 1. 개요

에이전틱 워크플로우(Agentic Workflow)는 AI 모델이 단순히 주어진 정보를 기반으로 답변을 생성하는 것에서 벗어나, **스스로 필요한 정보를 판단하고 도구(Tool)를 호출하여 데이터를 수집한 뒤 최종 응답을 생성**하는 방식입니다.

본 프로젝트에서는 OpenAI GPT-4o의 **Function Calling** 기능을 활용하여 이를 구현하였습니다.

---

## 2. 기존 방식과의 비교

### 기존 방식 (Rule-based Data Injection)

```
사용자 요청
    │
    ▼
서버: 날씨 API 3개 무조건 호출 (기온/미세먼지/자외선)
    │
    ▼
수집 데이터를 System Prompt에 텍스트로 삽입
    │
    ▼
AI: 주어진 텍스트 기반으로 응답 생성
    │
    ▼
최종 응답 반환
```

**한계점**:
- 질문과 무관하게 항상 3개의 API를 호출 → 불필요한 외부 API 비용 발생
- 단일 위치(현재 GPS)만 조회 가능 → 여러 장소 비교 불가
- AI가 판단 과정 없이 전달받은 데이터만 해석

---

### 에이전틱 방식 (Agentic Workflow)

```
사용자 요청
    │
    ▼
AI: 질문 분석 → 필요한 도구 판단
    │
    ├──── get_weather("반포동") ────────┐
    ├──── get_air_quality("강남동") ───►│ 서버에서 실제 API 호출
    ├──── get_uv_index("역삼동") ───────┘
    └──── get_user_favorite_places()
    │
    ▼
도구 실행 결과를 AI에게 전달
    │
    ▼
AI: 수집된 데이터 기반으로 응답 생성 (추가 도구 필요 시 반복)
    │
    ▼
최종 응답 반환
```

**개선점**:
- AI가 질문에 따라 필요한 도구만 선택적으로 호출
- 동일한 도구를 여러 장소에 반복 호출 가능 → 다중 장소 비교 실현
- AI가 추론 과정에서 도구를 활용하므로 더 정확한 맥락 기반 응답 생성

---

## 3. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Frontend)                     │
│         POST /ai/question/agent                         │
│         { googleId, prompt }                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                 AgentResponse Controller                 │
│                                                         │
│  1. 사용자 정보 조회 (MongoDB)                           │
│  2. System Prompt 구성 (유저 프로필 포함)                │
│  3. Agent Loop 실행 (최대 5회 반복)                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │      OpenAI GPT-4o      │
        │   (Function Calling)    │
        └────────────┬────────────┘
                     │ Tool Call 요청
        ┌────────────▼────────────────────────────┐
        │           Tool Executor                  │
        │                                         │
        │  get_weather(dong)                       │
        │    └─ 기상청 초단기실황 API              │
        │                                         │
        │  get_air_quality(dong)                   │
        │    └─ 한국환경공단 대기질 API            │
        │                                         │
        │  get_uv_index(dong)                      │
        │    └─ 기상청 생활기상지수 API            │
        │                                         │
        │  get_user_favorite_places()              │
        │    └─ MongoDB 사용자 즐겨찾기 조회       │
        └─────────────────────────────────────────┘
```

---

## 4. 도구(Tool) 명세

| 도구명 | 설명 | 파라미터 | 반환값 |
|---|---|---|---|
| `get_weather` | 기온·풍속·습도·강수형태 조회 | `dong: string` | 기상 데이터 객체 |
| `get_air_quality` | PM10·PM2.5·통합대기지수 조회 | `dong: string` | 대기질 데이터 객체 |
| `get_uv_index` | 자외선 지수 조회 | `dong: string` | `{ 자외선지수: number }` |
| `get_user_favorite_places` | 사용자 즐겨찾는 장소 목록 조회 | 없음 | 장소 배열 |
| `get_forecast` | 미래 시간대 날씨 예보 조회 | `dong: string`, `target_hour: number` | 예보 데이터 객체 |

### get_forecast 상세

| target_hour 범위 | 사용 API | 설명 |
|---|---|---|
| 1 ~ 6시간 | 초단기예보 (`getUltraSrtFcst`) | 30분 단위 갱신, 고정밀 단기 예측 |
| 7 ~ 72시간 | 단기예보 (`getVilageFcst`) | 3일 이내 예보, 강수확률 포함 |

**반환 필드:**

```json
{
  "targetTime": "2026-05-28 18:00",
  "기온": "24°C",
  "하늘상태": "구름많음",
  "강수형태": "없음",
  "강수확률": "20%",
  "습도": "65%",
  "풍속": "1.5m/s"
}
```
> `강수확률`은 단기예보(7h 이상)에서만 제공됩니다.

---

## 5. Agent Loop 동작 원리

```typescript
for (let i = 0; i < MAX_ITERATIONS; i++) {

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,          // 대화 이력 전체
    tools,             // 사용 가능한 도구 목록
    tool_choice: 'auto'
  });

  const message = response.choices[0].message;

  // 도구 호출 없음 → 최종 응답
  if (!message.tool_calls) {
    return res.json({ answer: message.content });
  }

  // 도구 호출 있음 → 병렬 실행 후 결과 대화 이력에 추가
  for (const toolCall of message.tool_calls) {
    const result = await executeTool(toolCall.function.name, args);
    messages.push({ role: 'tool', content: JSON.stringify(result) });
  }

  // 다음 반복에서 AI가 도구 결과를 바탕으로 재판단
}
```

핵심은 **대화 이력(messages)에 도구 호출 결과를 누적**하여 AI가 이전 조회 결과를 기억하고 추가 판단을 내릴 수 있다는 점입니다.

---

## 6. 활용 시나리오

### 시나리오 1: 다중 장소 비교
> "내 즐겨찾는 장소 중 오늘 어디 공기가 제일 좋아?"

```
1. get_user_favorite_places() → [강남동, 반포동, 역삼동]
2. get_air_quality("강남동") → PM2.5: 45
3. get_air_quality("반포동") → PM2.5: 22  ← 최저
4. get_air_quality("역삼동") → PM2.5: 38
→ "반포동이 PM2.5 22㎍/㎥로 가장 공기가 좋습니다."
```

### 시나리오 2: 복합 조건 안전 판단
> "오늘 아이 데리고 강남동에 나가도 될까?"

```
1. get_air_quality("강남동") → PM2.5: 45 (보통)
2. get_uv_index("강남동")   → 자외선: 9 (매우 높음) ← 위험 요소 발견
3. get_weather("강남동")    → 풍속: 강
→ 사용자 민감도 "영유아동반" 적용
→ "PM은 보통이지만 자외선이 매우 높고 바람이 강해 외출을 권장하지 않습니다."
```

### 시나리오 3: 단일 질문 최적화
> "지금 미세먼지 어때?"

```
1. get_air_quality("현재위치 동") → 결과 반환
→ get_weather, get_uv_index는 호출하지 않음 (불필요)
```

### 시나리오 4: 시간대별 예보 활용
> "오늘 저녁 6시에 역삼동에서 운동해도 될까?"

```
1. get_forecast("역삼동", 4)  → 4시간 후 예보 조회 (초단기예보)
   결과: 기온 24°C, 흐림, 강수 없음, 풍속 1.5m/s
2. 사용자 민감도 "천식/호흡기" 적용
→ "흐리지만 강수는 없고 풍속이 낮아 가벼운 운동은 가능합니다."
```

### 시나리오 5: 주간 계획 수립
> "이번 주 수요일 오전에 조깅 가능해?"

```
1. get_user_favorite_places() → 즐겨찾는 장소 확인
2. get_forecast("역삼동", 48) → 48시간 후 예보 (단기예보)
   결과: 기온 22°C, 맑음, 강수확률 10%, 풍속 0.8m/s
→ "수요일 오전은 맑고 강수 확률이 낮아 조깅하기 좋은 날씨입니다."
```

---

## 7. 기술 스택

| 항목 | 기술 |
|---|---|
| AI 모델 | OpenAI GPT-4o |
| Function Calling | OpenAI Chat Completions API (`tools` 파라미터) |
| 서버 프레임워크 | Node.js + Express + TypeScript |
| 데이터베이스 | MongoDB (Mongoose) |
| 날씨 API | 기상청 초단기실황 API, 한국환경공단 대기질 API, 기상청 자외선지수 API |

---

## 8. 보안 설계

### 인증 방식
- 모든 요청은 Google OAuth 세션(`req.user`)을 통해 인증
- `googleId`를 요청 Body로 받지 않음 — 서버가 세션에서 직접 추출
- 비로그인 요청은 401 반환

```typescript
// 세션에서 직접 추출 (Body 폴백 없음)
const googleId = (req.user as any)?.googleId;
if (!googleId) return res.status(401).json({ error: '로그인이 필요합니다.' });
```

---

## 10. API 엔드포인트

```
POST /ai/question/agent

Request Body:
{
  "googleId": "사용자 구글 ID",
  "prompt": "오늘 강남에서 운동해도 될까?"
}

Response:
{
  "answer": "현재 강남동의 미세먼지는 보통 수준이나..."
}
```

---

## 11. 기존 방식 대비 핵심 차이 요약

| 구분 | 기존 방식 | 에이전틱 방식 |
|---|---|---|
| 데이터 수집 주체 | 서버(고정 로직) | AI(동적 판단) |
| API 호출 횟수 | 항상 3개 고정 | 질문에 따라 1~N개 |
| 다중 장소 비교 | 불가 | 가능 |
| 확장성 | 새 기능 추가 시 서버 코드 수정 필요 | 도구만 추가하면 AI가 자동 활용 |
| 응답 정확도 | 과잉 정보 포함 가능 | 필요한 데이터만 수집하여 정확도 향상 |

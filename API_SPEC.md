# 📡 API 명세서

**Base URL** `http://localhost:3000`  
**작성일** 2026-06-14

---

## 목차

| # | 섹션 |
|---|---|
| # | 섹션 |
|---|---|
| 1 | [OAuth (구글 로그인)](#1--oauth) |
| 2 | [User (회원)](#2--user) |
| 2-1 | &nbsp;&nbsp; POST /user/enroll |
| 2-2 | &nbsp;&nbsp; GET /user/get |
| 2-3 | &nbsp;&nbsp; PUT /user/update |
| 3 | [Weather — 기온/풍속](#3--weather--기온풍속) |
| 4 | [Weather — 미세먼지](#4--weather--미세먼지) |
| 5 | [Weather — 자외선](#5--weather--자외선) |
| 6 | [AI Agent](#6--ai-agent) |
| 7 | [공통 사항](#7--공통-사항) |

---

## 1 🔐 OAuth

### `GET /oauth/google`

구글 로그인 페이지로 리다이렉트합니다.

- **인증** 불필요
- **Response** 구글 로그인 페이지로 리다이렉트

---

### `GET /oauth/google/callback`

구글 로그인 완료 후 자동 호출되는 콜백입니다. **직접 호출하지 않습니다.**

| 상황 | 리다이렉트 URL |
|---|---|
| 로그인 성공 | `http://localhost:5175/login?status=LOGIN_SUCCESS` |
| 미가입 유저 | `http://localhost:5175/login?status=USER_NOT_FOUND` |
| 로그인 실패 | `http://localhost:5175/login?status=LOGIN_FAIL` |

---

## 2 👤 User

### `POST /user/enroll`

온보딩 정보를 입력해 회원을 등록합니다.

- **인증** 필요 (Google OAuth 세션)

**Request Body**

```json
{
  "sensivity": ["천식/호흡기"],
  "activity_time": [
    { "type": "운동", "time": "18:00" },
    { "type": "출근", "time": "09:00" }
  ],
  "favorite_place": [
    { "name": "회사", "dong": "역삼동" },
    { "name": "집",   "dong": "반포동" }
  ],
  "felt_temperature_0":  -5,
  "felt_temperature_10":  8,
  "felt_temperature_20": 22,
  "felt_temperature_30": 33,
  "water_intake":  2000,
  "body_type":        2,
  "age":             25,
  "activity_level":   3
}
```

**파라미터**

| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `sensivity` | `string[]` | — | `일반` \| `천식/호흡기` \| `영유아동반` \| `노인` (복수 선택) |
| `activity_time` | `object[]` | — | 활동 시간대 (최대 5개) |
| `activity_time[].type` | `string` | ✅ | 활동 유형 (예: 운동, 출근) |
| `activity_time[].time` | `string` | ✅ | 시각 (예: `18:00`) |
| `favorite_place` | `object[]` | — | 즐겨찾는 장소 (최대 5개) |
| `favorite_place[].name` | `string` | ✅ | 장소명 (예: 회사) |
| `favorite_place[].dong` | `string` | ✅ | 동 이름 (예: 역삼동) |
| `felt_temperature_0` | `number` (정수) | — | 기온 0°C일 때 체감온도 |
| `felt_temperature_10` | `number` (정수) | — | 기온 10°C일 때 체감온도 |
| `felt_temperature_20` | `number` (정수) | — | 기온 20°C일 때 체감온도 |
| `felt_temperature_30` | `number` (정수) | — | 기온 30°C일 때 체감온도 |
| `water_intake` | `number` (정수) | — | 하루 물섭취량 (ml) |
| `body_type` | `number` (정수) | — | 체형 |
| `age` | `number` (정수) | — | 나이 |
| `activity_level` | `number` (정수) | — | 활동량 |

**Response `201`**

```json
{
  "_id": "665a1234...",
  "googleId": "1234567890",
  "name": "홍길동",
  "email": "hong@gmail.com",
  "onboarding": true,
  "sensivity": ["천식/호흡기"],
  "activity_time": [{ "type": "운동", "time": "18:00" }],
  "favorite_place": [{ "name": "회사", "dong": "역삼동" }],
  "felt_temperature_0": -5,
  "felt_temperature_10": 8,
  "felt_temperature_20": 22,
  "felt_temperature_30": 33,
  "water_intake": 2000,
  "body_type": 2,
  "age": 25,
  "activity_level": 3
}
```

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `401` | `{ "message": "로그인이 필요합니다." }` | 세션 없음 |
| `409` | `{ "message": "이미 가입된 계정입니다." }` | 중복 googleId |
| `500` | `{ "message": "서버 에러" }` | 서버 오류 |

---

### `GET /user/get`

로그인된 사용자 정보를 조회합니다.

- **인증** 필요 (세션 쿠키)
- **Request Body** 없음

**Response `200`** — `/user/enroll` 응답과 동일한 유저 객체

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `401` | `{ "message": "로그인이 필요합니다." }` | 세션 없음 |
| `404` | `{ "message": "사용자를 찾을 수 없습니다." }` | DB에 유저 없음 |
| `500` | `{ "message": "서버 에러" }` | 서버 오류 |

---

### `PUT /user/update`

로그인된 사용자 정보를 수정합니다. 보낸 필드만 업데이트되며 나머지는 유지됩니다.

- **인증** 필요 (Google OAuth 세션)

**Request Body** (모든 필드 선택)

```json
{
  "sensivity": ["천식/호흡기"],
  "activity_time": [
    { "type": "운동", "time": "07:00" }
  ],
  "favorite_place": [
    { "name": "회사", "dong": "강남구" }
  ],
  "felt_temperature_0":  -3,
  "felt_temperature_10":  7,
  "felt_temperature_20": 18,
  "felt_temperature_30": 28,
  "water_intake":  2000,
  "body_type":        2,
  "age":             25,
  "activity_level":   3,
  "onboarding":    true
}
```

**파라미터**

| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `sensivity` | `string[]` | — | `일반` \| `천식/호흡기` \| `영유아동반` \| `노인` (복수 선택) |
| `activity_time` | `object[]` | — | 활동 시간대 (최대 5개) |
| `activity_time[].type` | `string` | ✅ | 활동 유형 (예: 운동, 출근) |
| `activity_time[].time` | `string` | ✅ | 시각 (예: `07:00`) |
| `favorite_place` | `object[]` | — | 즐겨찾는 장소 (최대 5개) |
| `favorite_place[].name` | `string` | ✅ | 장소명 (예: 회사) |
| `favorite_place[].dong` | `string` | ✅ | 동/구 이름 (예: 강남구) |
| `felt_temperature_0` | `number` (정수) | — | 기온 0°C일 때 체감온도 |
| `felt_temperature_10` | `number` (정수) | — | 기온 10°C일 때 체감온도 |
| `felt_temperature_20` | `number` (정수) | — | 기온 20°C일 때 체감온도 |
| `felt_temperature_30` | `number` (정수) | — | 기온 30°C일 때 체감온도 |
| `water_intake` | `number` (정수) | — | 하루 물섭취량 (ml) |
| `body_type` | `number` (정수) | — | 체형 |
| `age` | `number` (정수) | — | 나이 |
| `activity_level` | `number` (정수) | — | 활동량 |
| `onboarding` | `boolean` | — | 온보딩 완료 여부 |

> `googleId` / `name` / `email` 은 수정 불가 (보내도 무시됨)

**Response `200`** — 업데이트된 전체 유저 객체 (`/user/enroll` 응답과 동일)

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `400` | `{ "message": "수정할 필드가 없습니다." }` | body 비어있음 |
| `400` | `{ "message": "..." }` | 스키마 유효성 검사 실패 (배열 5개 초과 등) |
| `401` | `{ "message": "로그인이 필요합니다." }` | 세션 없음 |
| `404` | `{ "message": "사용자를 찾을 수 없습니다." }` | DB에 유저 없음 |
| `500` | `{ "message": "서버 에러" }` | 서버 오류 |

---

## 3 🌡️ Weather — 기온/풍속

### `GET /getdata/temperture_wind`

기본 위치(수원시 기흥구)의 현재 기온/풍속을 조회합니다.

- **인증** 불필요 / **Query Params** 없음

**Response `200`**

```json
{
  "기온": "23.8°C",
  "풍속": "1.1m/s",
  "풍향": "308deg",
  "습도": "72%",
  "1시간강수량": "0mm",
  "강수형태": "0"
}
```

> **강수형태 코드** `0` 없음 | `1` 비 | `2` 비/눈 | `3` 눈 | `5` 빗방울 | `6` 빗방울/눈날림 | `7` 눈날림

---

### `GET /getdata/temperture_wind/nationwide`

전국 모든 동의 현재 기온/풍속을 조회합니다.

- **인증** 불필요 / **Query Params** 없음

**Response `200`**

```json
[
  {
    "sido": "서울특별시",
    "sigungu": "강남구",
    "dong": "역삼동",
    "기온": "24°C",
    "풍속": "1.5m/s",
    "풍향": "270deg",
    "습도": "65%",
    "1시간강수량": "0mm",
    "강수형태": "0"
  }
]
```

---

### `GET /getdata/temperture_wind/nearby`

특정 동 기준 반경 5km 이내 지역의 기온/풍속을 조회합니다.

- **인증** 불필요

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `dong` | `string` | ✅ | 기준 동 이름 (예: `역삼동`) |

**Response `200`**

```json
[
  {
    "sido": "서울특별시",
    "sigungu": "강남구",
    "dong": "역삼동",
    "distance": 0.0,
    "기온": "24°C",
    "풍속": "1.5m/s",
    "풍향": "270deg",
    "습도": "65%",
    "1시간강수량": "0mm",
    "강수형태": "0"
  }
]
```

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `400` | `{ "error": "dong은 필수입니다." }` | dong 미입력 |
| `404` | `{ "error": "해당 동을 찾을 수 없습니다." }` | 매핑 데이터 없음 |

---

## 4 🌫️ Weather — 미세먼지

### `GET /getdata/pm`

특정 좌표의 현재 미세먼지를 조회합니다.

- **인증** 불필요

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `lat` | `number` | ✅ | 위도 (예: `37.4989`) |
| `lng` | `number` | ✅ | 경도 (예: `127.0316`) |

**Response `200`**

```json
{
  "미세먼지": "35㎍/㎥",
  "초미세먼지": "18㎍/㎥",
  "통합대기환경지수": "2",
  "측정시간": "2026-06-04 14:00"
}
```

> **통합대기환경지수** `1` 좋음 | `2` 보통 | `3` 나쁨 | `4` 매우나쁨

---

### `GET /getdata/pm/nationwide`

전국 모든 동의 현재 미세먼지를 조회합니다.

- **인증** 불필요 / **Query Params** 없음

**Response `200`**

```json
[
  {
    "sido": "서울특별시",
    "sigungu": "강남구",
    "dong": "역삼동",
    "미세먼지": "35㎍/㎥",
    "초미세먼지": "18㎍/㎥",
    "통합대기환경지수": "2",
    "측정시간": "2026-06-04 14:00"
  }
]
```

---

### `GET /getdata/pm/nearby`

특정 동 기준 반경 5km 이내 지역의 미세먼지를 조회합니다.

- **인증** 불필요

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `dong` | `string` | ✅ | 기준 동 이름 (예: `역삼동`) |

**Response `200`**

```json
[
  {
    "sido": "서울특별시",
    "sigungu": "강남구",
    "dong": "역삼동",
    "areaNo": "1168000000",
    "distance": 0.0,
    "미세먼지": "35㎍/㎥",
    "초미세먼지": "18㎍/㎥",
    "통합대기환경지수": "2",
    "측정시간": "2026-06-04 14:00"
  }
]
```

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `400` | `{ "error": "dong은 필수입니다." }` | dong 미입력 |
| `404` | `{ "error": "해당 동을 찾을 수 없습니다." }` | 매핑 데이터 없음 |

---

## 5 ☀️ Weather — 자외선

### `GET /getdata/uv`

기본 위치의 현재 자외선 지수를 조회합니다.

- **인증** 불필요 / **Query Params** 없음

**Response `200`**

```json
{ "uv": 3 }
```

> **자외선 지수** `0~2` 낮음 | `3~5` 보통 | `6~7` 높음 | `8~10` 매우높음 | `11+` 위험

---

### `GET /getdata/uv/nationwide`

전국 모든 동의 현재 자외선 지수를 조회합니다.

- **인증** 불필요 / **Query Params** 없음

**Response `200`**

```json
[
  {
    "sido": "서울특별시",
    "sigungu": "강남구",
    "dong": "역삼동",
    "uv": 3
  }
]
```

---

### `GET /getdata/uv/nearby`

특정 동 기준 반경 5km 이내 지역의 자외선 지수를 조회합니다.

- **인증** 불필요

**Query Params**

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `dong` | `string` | ✅ | 기준 동 이름 (예: `역삼동`) |

**Response `200`**

```json
[
  {
    "sido": "서울특별시",
    "sigungu": "강남구",
    "dong": "역삼동",
    "areaNo": "1168000000",
    "distance": 0.0,
    "uv": 3
  }
]
```

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `400` | `{ "error": "dong은 필수입니다." }` | dong 미입력 |
| `404` | `{ "error": "해당 동을 찾을 수 없습니다." }` | 매핑 데이터 없음 |

---

## 6 🤖 AI Agent

### `POST /ai-agent/question/agent`

GPT-4o 에이전틱 AI 응답을 생성합니다. AI가 필요한 날씨 데이터를 스스로 판단해 조회합니다.

- **인증** 필요 (Google OAuth 세션)

**Request Body**

```json
{
  "prompt": "오늘 저녁 6시에 운동해도 될까?",
  "dong": "강남구"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `prompt` | `string` | ✅ | 사용자 질문 |
| `dong` | `string` | — | 현재 위치 (시/군/구 단위 권장, 예: `강남구`, `영통구`). 없으면 AI가 즐겨찾는 장소로 폴백하거나 위치를 재질문 |

**Response `200`**

```json
{
  "answer": "현재 역삼동 기온은 24°C이며 자외선 지수는 낮습니다..."
}
```

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `400` | `{ "error": "prompt는 필수입니다." }` | prompt 미입력 |
| `401` | `{ "error": "로그인이 필요합니다." }` | 세션 없음 |
| `404` | `{ "error": "사용자를 찾을 수 없습니다." }` | DB에 유저 없음 |
| `500` | `{ "error": "AI 에이전트 응답 중 오류가 발생했습니다." }` | 서버 오류 |

**AI 내부 도구**

| 도구 | 설명 |
|---|---|
| `get_weather(dong)` | 현재 기온/풍속/습도/강수 조회 |
| `get_air_quality(dong)` | 미세먼지/초미세먼지 조회 |
| `get_uv_index(dong)` | 자외선 지수 조회 |
| `get_forecast(dong, target_hour)` | 미래 시간대 예보 조회 (최대 72h) |
| `get_user_favorite_places()` | 즐겨찾는 장소 목록 조회 |

---

### `DELETE /ai-agent/history`

현재 로그인한 사용자의 대화 이력을 초기화합니다.

- **인증** 필요 (Google OAuth 세션)
- **Request Body** 없음

**Response `200`**

```json
{ "message": "대화 이력이 초기화되었습니다." }
```

**에러 응답**

| 상태코드 | 응답 | 원인 |
|:---:|---|---|
| `401` | `{ "error": "로그인이 필요합니다." }` | 세션 없음 |
| `500` | `{ "error": "이력 초기화 중 오류가 발생했습니다." }` | 서버 오류 |

---

## 7 📌 공통 사항

### 인증 방식

세션 쿠키 기반입니다. 프론트에서 `axios` 사용 시 `withCredentials: true` 옵션이 필수입니다.

```javascript
axios.defaults.withCredentials = true;
```

### 동 이름 규칙

동 이름은 기상청 매핑 데이터 기준이며, 부분 매칭을 지원합니다.

> 예: `강남동` → `역삼동` (강남구 대표 동으로 자동 매핑)

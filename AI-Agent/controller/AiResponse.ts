// 서버사이드 (Next.js API route 등)


// const userProfile = await getUserProfile(userId);
// const environmentData = await getEnvData(userProfile.location); // 실시간 환경 데이터

// const systemPrompt = `
// 당신은 개인 환경 건강 어시스턴트입니다.

// [유저 정보]
// - 이름: ${userProfile.name}
// - 건강 민감도: ${userProfile.sensitivity} (예: 천식, 피부 민감)
// - 주요 활동 장소: ${userProfile.location}
// - 주로 활동하는 시간대: ${userProfile.activeTime}

// [현재 환경 데이터 - ${userProfile.location}]
// - 미세먼지(PM2.5): ${environmentData.pm25}
// - UV 지수: ${environmentData.uv}
// - 기온: ${environmentData.temp}

// 위 정보를 바탕으로 유저 질문에 개인화된 답변을 주세요.
// `;

// const response = await fetch("https://api.anthropic.com/v1/messages", {
//   method: "POST",
//   headers: {
//     "Content-Type": "application/json",
//     "x-api-key": process.env.ANTHROPIC_API_KEY,
//     "anthropic-version": "2023-06-01"
//   },
//   body: JSON.stringify({
//     model: "claude-sonnet-4-20250514",
//     max_tokens: 1000,
//     system: systemPrompt,
//     messages: [
//       { role: "user", content: userMessage }
//     ]
//   })
// });
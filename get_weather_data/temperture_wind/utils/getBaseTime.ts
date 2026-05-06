export function getBaseTime(): { baseDate: string; baseTime: string } {
  const now = new Date();
  
  // 1. 현재 시간에서 1시간을 뺍니다 (기상청 실황 데이터는 1시간 전 기준)
  now.setHours(now.getHours() - 1);
  
  // 2. 바뀐 시간 기준으로 날짜와 시간을 계산
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  
  const baseDate = `${year}${month}${day}`;
  const baseTime = `${hour}00`; // API는 '0500' 형태를 요구함
  
  return { baseDate, baseTime };
}
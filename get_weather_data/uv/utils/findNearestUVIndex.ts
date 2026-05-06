export function findNearestUVIndex(item: any): number {
  const now = new Date();
  const hour = now.getHours(); // 현재 시각
  const baseHour = 6;          // 발표 기준시각

  // 현재 시각과 가장 가까운 h값 계산
  const diff = hour - baseHour;
  const hKey = `h${Math.max(0, Math.floor(diff / 3) * 3)}`;

  return Number(item[hKey]) || 0;
}
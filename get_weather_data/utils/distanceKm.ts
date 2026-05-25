export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111;
  const dLon = (lon2 - lon1) * 88.7;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

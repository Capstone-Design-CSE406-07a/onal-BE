// mapping.ts
import {mappingData} from '../../Kma_Area_mapping';

interface Region {
  areaNo: string;
  sido: string;
  sigungu: string;
  dong: string;
  lat: number;
  lon: number;
  nx: number;
  ny: number;
}

const mapping: Region[] = mappingData;

export function findNearestRegion(userLat: number, userLon: number): Region {
  return mapping.reduce((nearest, region) => {
    const dist = Math.pow(region.lat - userLat, 2) + Math.pow(region.lon - userLon, 2);
    const nearestDist = Math.pow(nearest.lat - userLat, 2) + Math.pow(nearest.lon - userLon, 2);
    return dist < nearestDist ? region : nearest;
  });
}
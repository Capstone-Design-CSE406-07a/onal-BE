#!/usr/bin/env python3
"""
기상청 동네예보 격자 좌표 엑셀 → Kma_Area_mapping.ts 변환 스크립트

[ 사용 방법 ]
1. 아래 URL에서 엑셀 파일을 다운로드합니다.
   - 공공데이터포털: https://www.data.go.kr
   - 검색어: '기상청 동네예보 격자 위경도'
   - 파일명 예시: 기상청41_단기예보 조회서비스_오픈API활용가이드_격자_위경도(열린공공데이터).xlsx

2. 이 스크립트를 실행합니다.
   pip install openpyxl
   python scripts/generate_kma_mapping.py <엑셀파일경로>

3. get_weather_data/Kma_Area_mapping.ts 가 자동으로 덮어씌워집니다.

[ 결과 ]
  현재: 233개 (구당 대표 동 1~2개)
  변환 후: ~4,200개 (전국 읍면동 전체)
"""

import sys
import json
import os
import re

try:
    import openpyxl
except ImportError:
    print("openpyxl 패키지가 필요합니다: pip install openpyxl")
    sys.exit(1)


def parse_coord(value) -> float | None:
    """좌표값을 소수점 위경도(도)로 변환.
    - 초(arcseconds) 형식 감지: 위도 약 120000~144000초, 경도 약 115000~150000초
    """
    if value is None:
        return None
    try:
        v = float(str(value).strip())
    except ValueError:
        return None
    # 100000초 이상이면 초(seconds) 단위로 판단 → 3600으로 나눔
    if v > 100_000:
        return round(v / 3600, 6)
    return round(v, 6)


def find_col(headers: list[str], keywords: list[str]) -> int | None:
    """헤더 리스트에서 키워드를 포함하는 첫 번째 컬럼 인덱스 반환"""
    for kw in keywords:
        for i, h in enumerate(headers):
            if kw in h:
                return i
    return None


def main():
    excel_path = sys.argv[1] if len(sys.argv) > 1 else "기상청_격자_위경도.xlsx"

    if not os.path.exists(excel_path):
        print(f"[오류] 파일을 찾을 수 없습니다: {excel_path}")
        print()
        print("기상청 공공데이터포털(data.go.kr)에서 '동네예보 격자 위경도' 파일을 다운로드하세요.")
        print("  예: python scripts/generate_kma_mapping.py ~/Downloads/기상청_격자.xlsx")
        sys.exit(1)

    print(f"파일 읽는 중: {excel_path}")
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        print("[오류] 엑셀 파일이 비어 있습니다.")
        sys.exit(1)

    # 헤더 행 탐색 (처음 10행 중 '격자' 또는 '단계' 포함 행)
    header_row_idx = 0
    for i, row in enumerate(rows[:10]):
        row_str = " ".join(str(c) for c in row if c is not None)
        if "격자" in row_str or "단계" in row_str:
            header_row_idx = i
            break

    headers = [str(h).strip() if h is not None else "" for h in rows[header_row_idx]]
    print(f"헤더({header_row_idx}행): {headers}")

    col_nx     = find_col(headers, ["격자X", "NX", "nx", "X좌표", "X"])
    col_ny     = find_col(headers, ["격자Y", "NY", "ny", "Y좌표", "Y"])
    col_lon    = find_col(headers, ["경도", "lon", "LON", "Lon"])
    col_lat    = find_col(headers, ["위도", "lat", "LAT", "Lat"])
    col_sido   = find_col(headers, ["1단계", "sido", "시도", "광역"])
    col_sigungu= find_col(headers, ["2단계", "sigungu", "시군구"])
    col_dong   = find_col(headers, ["3단계", "dong", "읍면동", "행정동"])
    col_areano = find_col(headers, ["코드", "areaNo", "지역코드", "법정코드"])

    print(f"컬럼 인덱스: nx={col_nx} ny={col_ny} lat={col_lat} lon={col_lon} "
          f"sido={col_sido} sigungu={col_sigungu} dong={col_dong} areaNo={col_areano}")

    missing = [name for name, col in [
        ("격자X(nx)", col_nx), ("격자Y(ny)", col_ny),
        ("위도(lat)", col_lat), ("경도(lon)", col_lon),
        ("1단계(sido)", col_sido),
    ] if col is None]
    if missing:
        print(f"[오류] 필수 컬럼을 찾을 수 없습니다: {missing}")
        print("헤더 행을 확인하고 키워드를 조정하거나 파일 형식을 확인하세요.")
        sys.exit(1)

    entries = []
    seen: set[tuple] = set()
    skip_count = 0

    for row in rows[header_row_idx + 1:]:
        if all(c is None for c in row):
            continue

        try:
            nx  = int(float(str(row[col_nx])))  if row[col_nx]  is not None else None
            ny  = int(float(str(row[col_ny])))  if row[col_ny]  is not None else None
            lat = parse_coord(row[col_lat])
            lon = parse_coord(row[col_lon])
            sido    = str(row[col_sido]).strip()    if row[col_sido]    is not None else ""
            sigungu = str(row[col_sigungu]).strip() if col_sigungu is not None and row[col_sigungu] is not None else ""
            dong    = str(row[col_dong]).strip()    if col_dong    is not None and row[col_dong]    is not None else ""
            area_no = str(row[col_areano]).strip()  if col_areano  is not None and row[col_areano]  is not None else ""
        except Exception:
            skip_count += 1
            continue

        # 유효성 검사
        if not sido or sido in ("None", "1단계", "시도", "nan"):
            skip_count += 1
            continue
        if nx is None or ny is None or lat is None or lon is None:
            skip_count += 1
            continue
        if not (30 < lat < 40) or not (124 < lon < 132):
            # 한반도 범위 벗어난 좌표 제외
            skip_count += 1
            continue

        key = (sido, sigungu, dong)
        if key in seen:
            continue
        seen.add(key)

        entries.append({
            "areaNo": area_no,
            "sido": sido,
            "sigungu": sigungu,
            "dong": dong,
            "lat": lat,
            "lon": lon,
            "nx": nx,
            "ny": ny,
        })

    print(f"유효 항목: {len(entries)}개 / 스킵: {skip_count}개")

    if len(entries) < 100:
        print("[경고] 항목 수가 너무 적습니다. 파일이나 컬럼 매핑을 확인하세요.")

    # TypeScript 파일 생성
    out_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..", "get_weather_data", "Kma_Area_mapping.ts"
    )
    out_path = os.path.normpath(out_path)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("export const mappingData = [\n")
        for i, e in enumerate(entries):
            comma = "" if i == len(entries) - 1 else ","
            f.write(f"  {json.dumps(e, ensure_ascii=False)}{comma}\n")
        f.write("];\n")

    print(f"\n완료: {out_path}")
    print(f"총 {len(entries)}개 항목이 저장되었습니다.")


if __name__ == "__main__":
    main()

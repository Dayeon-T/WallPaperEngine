// 그리드 스냅 배치 기본값.
// 좌표계: GRID_COLS x GRID_ROWS 셀 단위, {x, y, w, h}
// 기본 프리셋은 기존 고정 레이아웃(가로/세로)을 그리드 좌표로 옮긴 것

export const GRID_COLS = 24
export const GRID_ROWS = 16
export const MIN_W = 3
export const MIN_H = 1

// 위젯별 최소 크기: 이보다 작아지면 내용이 깨지는 지점 직전까지만 축소 허용
export const MIN_SIZES = {
  profile:   { w: 4, h: 3 },
  folders:   { w: 3, h: 4 },
  clock:     { w: 4, h: 3 },
  cheer:     { w: 3, h: 2 },
  weather:   { w: 3, h: 3 },
  timetable: { w: 5, h: 8 },
  nowtime:   { w: 5, h: 3 },
  todo:      { w: 5, h: 4 },
  meals:     { w: 3, h: 3 },
  schedule:  { w: 3, h: 4 },
}

export function minSize(id) {
  return MIN_SIZES[id] || { w: MIN_W, h: MIN_H }
}

// 리사이즈 잠금: 내용 구조상 크기가 바뀌면 깨지는 위젯
// w: 가로 고정, h: 세로 고정 (이동은 항상 가능)
// 현재는 전부 해제 — 위젯들이 비례 단위(clamp/fr)로 그려져 크기 제한은 MIN_SIZES로 충분
export const SIZE_LOCKS = {}

export function sizeLock(id) {
  return SIZE_LOCKS[id] || {}
}

// 편집 모드 UI에 표시할 위젯 이름
export const WIDGET_NAMES = {
  profile: "프로필",
  folders: "폴더",
  clock: "시계",
  cheer: "응원",
  weather: "날씨",
  timetable: "시간표",
  nowtime: "지금 이 시각",
  todo: "할 일",
  meals: "급식 정보",
  schedule: "학사일정",
}

export const DEFAULT_LAYOUTS = {
  horizontal: {
    profile:   { x: 0,  y: 0, w: 5, h: 4 },
    folders:   { x: 0,  y: 4, w: 5, h: 12 },
    clock:     { x: 5,  y: 0, w: 7, h: 4 },
    cheer:     { x: 12, y: 0, w: 7, h: 4 },
    weather:   { x: 19, y: 0, w: 5, h: 4 },
    timetable: { x: 5,  y: 4, w: 7, h: 12 },
    nowtime:   { x: 12, y: 4, w: 7, h: 4 },
    todo:      { x: 12, y: 8, w: 7, h: 8 },
    meals:     { x: 19, y: 4, w: 5, h: 5 },
    schedule:  { x: 19, y: 9, w: 5, h: 7 },
  },
  // 세로(포트레이트) 모니터용. y는 0부터 시작해 16행을 빈틈없이 채웁니다.
  // 좌우 2단 구성은 그대로 두고, 위쪽에 비어 있던 4행은 대부분 시간표에 줍니다.
  // 시계/날씨/급식/학사일정은 높이를 늘리는 대신 가로를 반으로 줄여 자리를 만들었습니다.
  //        x0 ────── x12 ───── x18 ──── x24
  //   y0   │ 프로필  │ 시계  │ 날씨  │
  //   y3   │ 응원    │             │
  //   y5   │ 폴더    │   시간표     │
  //   y9   │ 지금    │             │
  //   y12  │ 할 일   │ 급식  │ 학사일정 │
  vertical: {
    // 왼쪽 단
    profile:   { x: 0,  y: 0,  w: 12, h: 3 },
    cheer:     { x: 0,  y: 3,  w: 12, h: 2 },
    folders:   { x: 0,  y: 5,  w: 12, h: 4 },
    nowtime:   { x: 0,  y: 9,  w: 12, h: 3 },
    todo:      { x: 0,  y: 12, w: 12, h: 4 },
    // 오른쪽 단
    clock:     { x: 12, y: 0,  w: 6,  h: 3 },
    weather:   { x: 18, y: 0,  w: 6,  h: 3 },
    timetable: { x: 12, y: 3,  w: 12, h: 9 },
    meals:     { x: 12, y: 12, w: 6,  h: 4 },
    schedule:  { x: 18, y: 12, w: 6,  h: 4 },
  },
}

// 저장된 레이아웃을 기본값 위에 병합.
// 새 위젯이 추가돼도 기본 위치가 나오고, 삭제된 위젯의 저장값은 무시됨
export function mergeLayouts(saved) {
  const out = {}
  for (const mode of Object.keys(DEFAULT_LAYOUTS)) {
    out[mode] = { ...DEFAULT_LAYOUTS[mode] }
    const savedMode = saved?.[mode]
    if (!savedMode) continue
    for (const [id, rect] of Object.entries(savedMode)) {
      if (out[mode][id] && isRect(rect)) out[mode][id] = rect
    }
  }
  return out
}

function isRect(r) {
  return r && [r.x, r.y, r.w, r.h].every((n) => Number.isFinite(n))
}

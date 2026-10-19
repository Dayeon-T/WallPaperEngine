// 교시 기준표와 교시 판정 로직의 단일 출처.
// NowTime · Messages · Timetable · Settings가 같은 규칙을 공유한다.

// 인덱스 = 교시 번호가 되도록 0번 자리를 null로 비워둔다.
// 시간표 entry의 start_period/end_period가 이 번호 기준이다.
export const DEFAULT_PERIOD_SCHEDULE = [
  null,
  { label: "1교시", start: "08:20", end: "09:10", enabled: true },
  { label: "2교시", start: "09:20", end: "10:10", enabled: true },
  { label: "3교시", start: "10:20", end: "11:10", enabled: true },
  { label: "4교시", start: "11:20", end: "12:10", enabled: true },
  { label: "점심시간", start: "12:10", end: "13:00", enabled: true },
  { label: "5교시", start: "13:00", end: "13:50", enabled: true },
  { label: "6교시", start: "14:00", end: "14:50", enabled: true },
  { label: "7교시", start: "15:00", end: "15:50", enabled: true },
  { label: "방과후 A", start: "16:30", end: "17:20", enabled: false },
  { label: "방과후 B", start: "18:20", end: "20:00", enabled: false },
]

export const DEFAULT_WORK_END_TIME = "16:00"

// 이 번호부터를 방과후로 취급한다 (석식 라벨·퇴근 시각 연장 기준).
export const AFTERSCHOOL_START = 9

// 점심시간의 배열 자리는 항상 5번이다. 시간표 entry가 교시 번호(배열 인덱스)를
// 가리키므로 점심 위치를 옮겨도 번호는 그대로 두고, "몇 교시 뒤에 오는지(after)"만
// 점심 항목에 따로 기억한다. 화면 순서는 orderPeriods()가 그 값으로 만든다.
export const LUNCH_INDEX = 5
export const DEFAULT_LUNCH_AFTER = 4
export const LUNCH_AFTER_MIN = 1
export const LUNCH_AFTER_MAX = 7

export function normalizeLunchAfter(value) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < LUNCH_AFTER_MIN || n > LUNCH_AFTER_MAX) return DEFAULT_LUNCH_AFTER
  return n
}

// schedule은 [null, 1교시, ...] 형태
export function getLunchAfter(schedule) {
  return normalizeLunchAfter(schedule[LUNCH_INDEX]?.after)
}

// 교시 번호(1~7교시, 점심 제외) → 배열 인덱스. 5교시부터는 점심 자리만큼 하나 밀린다.
export function periodNoToIndex(n) {
  return n < LUNCH_INDEX ? n : n + 1
}

export function timeToMin(str) {
  const [h, m] = str.split(":").map(Number)
  return h * 60 + m
}

// weekly_timetable(이번주 교환 기록)의 유효 주차 키. 예: "20260824"
export function getMondayStr() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}${m}${dd}`
}

// 설정에 저장된 교시값(saved, 0부터 시작하는 10칸)을 기본 교시표 위에 덮어쓴다.
// 반환은 DEFAULT_PERIOD_SCHEDULE과 같은 [null, 1교시, ...] 형태.
export function mergePeriodSchedule(saved) {
  const base = !Array.isArray(saved) || saved.length === 0 ? [] : saved
  return [
    null,
    ...DEFAULT_PERIOD_SCHEDULE.slice(1).map((def, i) => ({
      label: base[i]?.label || def.label,
      start: base[i]?.start || def.start,
      end: base[i]?.end || def.end,
      enabled: base[i]?.enabled ?? def.enabled,
      // 점심 항목만 위치(after)를 가진다
      ...(i + 1 === LUNCH_INDEX ? { after: normalizeLunchAfter(base[i]?.after) } : {}),
    })),
  ]
}

// 화면에 보이는 순서대로 늘어놓는다. 교시 번호(index)는 유지하고 null 자리는 뺀다.
// 점심시간은 after로 지정한 교시 바로 뒤에 끼운다.
export function orderPeriods(schedule) {
  const list = schedule.map((p, i) => (p ? { ...p, index: i } : null)).filter(Boolean)
  const lunch = list.find((p) => p.index === LUNCH_INDEX)
  const rest = list.filter((p) => p.index !== LUNCH_INDEX)
  if (!lunch) return rest
  const afterIndex = periodNoToIndex(getLunchAfter(schedule))
  const pos = rest.findIndex((p) => p.index === afterIndex)
  rest.splice(pos + 1, 0, lunch)
  return rest
}

// 교시 번호(index)는 유지한 채 활성 교시만 화면 순서대로 남긴다.
// entry의 start_period/end_period가 원래 교시 번호 기준이기 때문이다.
export function getEnabledPeriods(schedule) {
  return orderPeriods(schedule).filter((p) => p.enabled !== false)
}

// entry(start_period~end_period 범위)가 해당 교시를 덮는지.
// 점심 칸(5)은 번호 범위 안에 끼어 있어도 건너뛴다. 4~5교시 블록(4..6)이
// 점심을 삼키면 점심 위치를 옮겼을 때 엉뚱한 줄에 그려지기 때문이다.
// entry가 점심 칸에서 시작하거나 끝나는 경우에만 점심을 포함한다.
export function entryCoversPeriod(entry, periodIndex) {
  if (periodIndex < entry.start_period || periodIndex > entry.end_period) return false
  if (periodIndex === LUNCH_INDEX) {
    return entry.start_period === LUNCH_INDEX || entry.end_period === LUNCH_INDEX
  }
  return true
}

// 현재 시각(분)이 속한 교시 슬롯을 반환. 없으면 null.
export function findCurrentPeriod(enabledPeriods, currentMin) {
  return (
    enabledPeriods.find(
      (p) => currentMin >= timeToMin(p.start) && currentMin < timeToMin(p.end)
    ) || null
  )
}

// 인접 교시 사이가 비어 있으면 쉬는 시간 슬롯으로 만든다.
export function buildBreakSlots(enabledPeriods) {
  const breaks = []
  for (let i = 0; i < enabledPeriods.length - 1; i++) {
    const cur = enabledPeriods[i]
    const next = enabledPeriods[i + 1]
    if (!cur || !next) continue
    if (cur.end !== next.start) {
      const label = cur.label === "점심시간" || next.label === "점심시간" ? "점심시간" :
        cur.index >= AFTERSCHOOL_START ? "석식시간" : "쉬는 시간"
      breaks.push({ start: cur.end, end: next.start, label })
    }
  }
  return breaks
}

// weekly_timetable 컬럼이 이번 주 것일 때만 교환 기록을 돌려준다.
// stale: 지난주 기록이 남아 있어 정리(null 저장)가 필요한 상태.
export function getWeeklyOverrides(wt) {
  if (wt && wt.week === getMondayStr()) {
    return { map: wt.map || {}, classMap: wt.classMap || {}, stale: false }
  }
  return { map: {}, classMap: {}, stale: !!wt }
}

// 해당 교시의 수업을 찾되, 이번주 교환 기록이 있으면 그 값을 우선한다.
// (교환으로 비운 칸은 override 값이 null이므로 undefined 비교여야 한다)
export function resolveEntry(todayEntries, overrides, dayIndex, periodIndex) {
  const key = `${dayIndex}-${periodIndex}`
  if (overrides && overrides[key] !== undefined) return overrides[key]
  return todayEntries.find((e) => entryCoversPeriod(e, periodIndex)) || null
}

// 교시 기준표와 교시 판정 로직의 단일 출처.
// NowTime · Messages · Timetable · Settings · (예정) 교실 칠판(/board)이 같은 규칙을 공유한다.

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
    })),
  ]
}

// 교시 번호(index)는 유지한 채 활성 교시만 남긴다.
// entry의 start_period/end_period가 원래 교시 번호 기준이기 때문이다.
export function getEnabledPeriods(schedule) {
  return schedule
    .map((p, i) => (p ? { ...p, index: i } : null))
    .filter((p) => p && p.enabled !== false)
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
  return (
    todayEntries.find(
      (e) => periodIndex >= e.start_period && periodIndex <= e.end_period
    ) || null
  )
}

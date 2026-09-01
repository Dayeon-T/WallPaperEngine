export const NEIS_KEY = "8be43b7eb1f64322a99618a512200af0"

// domain: 교육청 공식 도메인. 나이스는 {약자}.neis.go.kr, K-에듀파인은 klef.{도메인} 패턴.
// 경북만 gbe.kr로 .go가 없다.
export const EDUCATION_OFFICES = [
  { code: "B10", name: "서울특별시교육청", domain: "sen.go.kr" },
  { code: "C10", name: "부산광역시교육청", domain: "pen.go.kr" },
  { code: "D10", name: "대구광역시교육청", domain: "dge.go.kr" },
  { code: "E10", name: "인천광역시교육청", domain: "ice.go.kr" },
  { code: "F10", name: "광주광역시교육청", domain: "gen.go.kr" },
  { code: "G10", name: "대전광역시교육청", domain: "dje.go.kr" },
  { code: "H10", name: "울산광역시교육청", domain: "use.go.kr" },
  { code: "I10", name: "세종특별자치시교육청", domain: "sje.go.kr" },
  { code: "J10", name: "경기도교육청", domain: "goe.go.kr" },
  { code: "K10", name: "강원특별자치도교육청", domain: "gwe.go.kr" },
  { code: "M10", name: "충청북도교육청", domain: "cbe.go.kr" },
  { code: "N10", name: "충청남도교육청", domain: "cne.go.kr" },
  { code: "P10", name: "전북특별자치도교육청", domain: "jbe.go.kr" },
  { code: "Q10", name: "전라남도교육청", domain: "jne.go.kr" },
  { code: "R10", name: "경상북도교육청", domain: "gbe.kr" },
  { code: "S10", name: "경상남도교육청", domain: "gne.go.kr" },
  { code: "T10", name: "제주특별자치도교육청", domain: "jje.go.kr" },
]

// 소속 교육청에 맞는 나이스·에듀파인 주소로 기본 퀵링크를 만든다.
// 교육청 미설정 계정은 기존 기본값(서울)을 그대로 쓴다.
export function getDefaultQuickLinks(atptCode) {
  const office = EDUCATION_OFFICES.find((o) => o.code === atptCode)
  const domain = office?.domain || "sen.go.kr"
  return [
    { name: "나이스", url: `https://${domain.split(".")[0]}.neis.go.kr/` },
    { name: "에듀파인", url: `https://klef.${domain}/` },
    { name: "클래스룸", url: "https://classroom.google.com/" },
  ]
}

export async function searchSchools(atptCode, keyword) {
  if (!atptCode || !keyword || keyword.length < 2) return []

  const url =
    `https://open.neis.go.kr/hub/schoolInfo?KEY=${NEIS_KEY}&Type=json&pIndex=1&pSize=20` +
    `&ATPT_OFCDC_SC_CODE=${atptCode}&SCHUL_NM=${encodeURIComponent(keyword)}`

  const res = await fetch(url)
  const data = await res.json()
  const rows = data.schoolInfo?.[1]?.row ?? []

  return rows.map((r) => ({
    schoolCode: r.SD_SCHUL_CODE,
    schoolName: r.SCHUL_NM,
    address: r.ORG_RDNMA,
  }))
}

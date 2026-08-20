import LegalLayout, { Article, Table } from "../legal/LegalLayout"
import {
  SERVICE_NAME, OPERATOR, EFFECTIVE_DATE,
  SIGNUP_CONSENT, GENERATED_DATA, PROCESSORS,
} from "../legal/policy"

export default function Privacy() {
  return (
    <LegalLayout title="개인정보처리방침">
      <p>
        {OPERATOR.name}(이하 “운영자”)은 개인정보 보호법 제30조에 따라 정보주체의
        개인정보를 보호하고 이와 관련한 고충을 신속하게 처리할 수 있도록 다음과 같이
        개인정보처리방침을 수립·공개합니다.
      </p>

      <Article no="1" title="개인정보의 처리 목적">
        <p>운영자는 다음의 목적으로 개인정보를 처리하며, 목적이 변경되는 경우에는 사전에 동의를 받습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>회원 가입 의사 확인, 회원 자격 유지·관리, 본인 확인</li>
          <li>만 14세 미만 아동의 가입을 막기 위한 연령 확인 (개인정보 보호법 제22조의2)</li>
          <li>대시보드 서비스 제공 — 시간표, 할 일, 급식, 학사일정, 날씨, D-Day</li>
          <li>교사 간 쪽지 및 친구 기능 제공</li>
          <li>생일 축하 기능 제공</li>
          <li>문의 응대 및 서비스 개선</li>
        </ul>
      </Article>

      <Article no="2" title="수집하는 개인정보의 항목과 보유 기간">
        <p className="font-semibold">① 회원 가입 시 (필수)</p>
        <Table
          head={["구분", "내용"]}
          rows={[
            ["수집 항목", SIGNUP_CONSENT.items],
            ["수집 목적", SIGNUP_CONSENT.purpose],
            ["보유 기간", SIGNUP_CONSENT.period],
          ]}
        />
        <p className="font-semibold pt-2">② 서비스 이용 과정에서 생성·입력되는 정보</p>
        <Table head={["항목", "이용 목적"]} rows={GENERATED_DATA} />
        <p className="text-sm text-muted">
          ②의 정보 역시 회원 탈퇴 시까지 보유하며, 탈퇴와 동시에 파기됩니다.
        </p>
      </Article>

      <Article no="3" title="위치정보의 처리">
        <p>
          날씨 위젯은 브라우저의 위치 권한을 통해 이용자의 위치 좌표를 받아 기상 정보와
          지역명을 조회합니다. 이때 위치 좌표는 <strong>운영자의 서버에 저장되지 않으며</strong>,
          조회 직후 폐기됩니다.
        </p>
        <p>
          위치 권한은 브라우저에서 언제든 차단할 수 있고, 차단하더라도 날씨 위젯을 제외한
          모든 기능은 정상적으로 이용할 수 있습니다.
        </p>
      </Article>

      <Article no="4" title="개인정보의 제3자 제공">
        <p>
          운영자는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 특별한
          규정이 있거나 수사기관이 법이 정한 절차와 방법에 따라 요구하는 경우는 예외로 합니다.
        </p>
        <p>
          쪽지·친구 기능에서 이용자의 이름과 프로필 사진은 <strong>이용자 본인이 친구 코드를
          공유하여 친구를 맺었거나, 이미 쪽지를 주고받은 상대</strong>에게만 표시됩니다.
          같은 학교에 소속되었다는 이유만으로는 다른 이용자에게 공개되지 않습니다.
        </p>
      </Article>

      <Article no="5" title="개인정보 처리의 위탁 및 국외 이전">
        <p>
          운영자는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있으며,
          위탁받는 자가 국외에 있으므로 개인정보 보호법 제28조의8 제1항 제3호에 따라
          그 내용을 공개합니다. 이용자는 아래 국외 이전을 거부할 수 있으나, 거부 시
          서비스 이용이 불가능합니다.
        </p>
        <Table
          head={["이전받는 자", "이전 국가", "이전 목적", "이전 항목", "보유 기간"]}
          rows={PROCESSORS.map((p) => [p.name, p.country, p.purpose, p.items, p.period])}
        />
      </Article>

      <Article no="6" title="개인정보의 파기 절차 및 방법">
        <p>
          운영자는 보유 기간이 지나거나 처리 목적이 달성되면 지체 없이 해당 개인정보를 파기합니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>파기 절차</strong> — 설정 화면의 “회원 탈퇴”를 실행하면 계정과 이에 연결된
            프로필, 시간표, 할 일, 쪽지, 친구 관계, 프로필 사진이 즉시 함께 삭제됩니다.
          </li>
          <li>
            <strong>파기 방법</strong> — 전자적 파일 형태의 정보는 복구할 수 없는 방법으로
            영구 삭제합니다.
          </li>
        </ul>
      </Article>

      <Article no="7" title="정보주체의 권리와 행사 방법">
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보 열람 요구 — 설정 화면에서 직접 확인</li>
          <li>오류 등이 있을 경우 정정 요구 — 설정 화면에서 직접 수정</li>
          <li>삭제 요구 — 설정 화면의 “회원 탈퇴”</li>
          <li>처리 정지 요구 — 아래 연락처로 요청</li>
        </ul>
        <p>
          권리 행사는 {OPERATOR.email} 로 서면·전자우편을 통해서도 요청할 수 있으며,
          운영자는 지체 없이 조치합니다. 정보주체가 만 14세 미만인 경우 이 서비스는
          가입 자체가 제한됩니다.
        </p>
      </Article>

      <Article no="8" title="개인정보의 안전성 확보 조치">
        <ul className="list-disc space-y-1 pl-5">
          <li>비밀번호는 복호화가 불가능한 방식으로 암호화되어 저장됩니다.</li>
          <li>모든 통신 구간은 HTTPS로 암호화됩니다.</li>
          <li>
            데이터베이스에 행 단위 접근 제어(RLS)를 적용하여, 이용자는 본인의 데이터와
            본인이 허용한 범위의 정보에만 접근할 수 있습니다.
          </li>
          <li>개인정보 처리 권한은 운영자 본인으로 최소화하여 관리합니다.</li>
        </ul>
      </Article>

      <Article no="9" title="개인정보 자동 수집 장치의 설치·운영 및 거부">
        <p>
          서비스는 로그인 상태 유지를 위해 브라우저의 저장소(localStorage)에 인증 토큰과
          화면 설정값을 저장합니다. 광고나 이용자 행태 분석을 위한 쿠키는 사용하지 않습니다.
        </p>
        <p>
          브라우저 설정에서 저장소를 삭제하거나 차단할 수 있으며, 차단 시 로그인 상태가
          유지되지 않습니다.
        </p>
      </Article>

      <Article no="10" title="개인정보 보호책임자">
        <Table
          head={["구분", "내용"]}
          rows={[
            ["개인정보 보호책임자", OPERATOR.privacyOfficer],
            ["운영 주체", `${OPERATOR.name} (${OPERATOR.type})`],
            ["연락처", OPERATOR.email],
          ]}
        />
        <p>
          {SERVICE_NAME} 이용 중 발생한 개인정보 보호 관련 문의, 불만 처리, 피해 구제는
          위 연락처로 접수하실 수 있으며 지체 없이 답변드립니다.
        </p>
      </Article>

      <Article no="11" title="권익침해 구제 방법">
        <p>
          개인정보 침해로 인한 신고나 상담이 필요하시면 아래 기관에 문의하실 수 있습니다.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>개인정보분쟁조정위원회 — 1833-6972 (www.kopico.go.kr)</li>
          <li>개인정보침해신고센터 — 118 (privacy.kisa.or.kr)</li>
          <li>대검찰청 사이버수사과 — 1301 (www.spo.go.kr)</li>
          <li>경찰청 사이버수사국 — 182 (ecrm.police.go.kr)</li>
        </ul>
      </Article>

      <Article no="12" title="개인정보처리방침의 변경">
        <p>
          이 방침은 {EFFECTIVE_DATE}부터 적용됩니다. 내용이 추가·삭제·수정되는 경우에는
          변경 사항의 시행 7일 전부터 서비스 내 공지를 통해 알려드립니다. 다만 이용자
          권리의 중요한 변경이 있는 경우에는 최소 30일 전에 알려드립니다.
        </p>
      </Article>
    </LegalLayout>
  )
}

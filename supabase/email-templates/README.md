# Supabase 인증 메일 템플릿

앱 색상(`#4A4A4A` / `#2b2b2b` / `#eeeeee`)에 맞춘 메일 템플릿입니다.

| 파일 | 대시보드 템플릿 이름 | 언제 발송되나 |
|---|---|---|
| `confirm-signup.html` | Confirm signup | 회원가입 직후 |
| `reset-password.html` | Reset Password | 비밀번호 찾기 |
| `change-email.html` | Change Email Address | 설정에서 이메일 변경 |

## 적용 방법

1. Supabase 대시보드 → **Authentication** → **Emails** → **Templates**
2. 위 표의 템플릿을 고르고 **Source**(HTML) 모드로 전환
3. 해당 파일 내용을 **전체 복사해서 붙여넣기**
4. 제목(Subject)도 함께 바꿔주세요

   - Confirm signup → `[PLANSCHOOL] 이메일 인증을 완료해 주세요`
   - Reset Password → `[PLANSCHOOL] 비밀번호 재설정 안내`
   - Change Email Address → `[PLANSCHOOL] 이메일 주소 변경 확인`

5. **Save**

## 사용한 변수

Supabase가 발송 직전에 채워 넣는 값입니다. 오타가 나면 값이 비어버리니 그대로 두세요.

- `{{ .ConfirmationURL }}` — 인증/재설정 링크
- `{{ .Email }}` — 받는 사람 이메일
- `{{ .NewEmail }}` — 변경하려는 새 이메일 (Change Email 전용)

## 수정할 때 알아둘 점

메일은 웹페이지와 렌더링 방식이 다릅니다. 아래를 지키지 않으면 일부 메일 앱에서 레이아웃이 깨집니다.

- **flex, grid, `<style>` 태그를 쓰지 마세요.** Gmail은 `<head>`의 스타일을 지웁니다. 그래서 모든 스타일을 태그마다 `style="..."`로 직접 넣었습니다.
- **레이아웃은 `<table>`로 짭니다.** div 중첩은 Outlook에서 무너집니다.
- **웹폰트는 대부분 무시됩니다.** Pretendard를 먼저 지정하고 각 OS 기본 한글 폰트로 이어지도록 해뒀습니다.
- 버튼 배경색은 `<td>`의 `bgcolor` 속성에 넣어야 Outlook에서도 색이 나옵니다.

## 실제 발송 전에 꼭 확인할 것

### 1. 기본 메일 서버는 테스트용입니다

Supabase가 무료로 제공하는 발송 서버는 **시간당 몇 통 수준으로 제한**되어 있고, 공식적으로 테스트 용도로만 안내됩니다. 선생님들께 배포하면 가입이 몰릴 때 메일이 아예 안 나갑니다.

실제 운영에는 **Custom SMTP** 연결이 필요합니다. Authentication → Emails → **SMTP Settings**에서 설정하며, Resend나 SendGrid 같은 서비스의 무료 구간으로도 충분합니다. 현재 제한값은 Authentication → **Rate Limits**에서 확인할 수 있습니다.

### 2. Site URL이 배포 주소로 맞춰져 있어야 합니다

메일 링크를 누르면 **Site URL**로 돌아옵니다. 이 값이 기본값이나 `localhost`로 남아 있으면, 사용자는 열리지 않는 주소로 이동하게 됩니다.

Authentication → **URL Configuration**에서 Site URL을 실제 배포 주소로 바꾸고, 개발용 `http://localhost:5173`은 Redirect URLs에 따로 추가해 두세요.

### 3. 비밀번호 재설정 링크는 `/reset-password`로 돌아옵니다

재설정 메일의 링크를 누르면 [src/pages/ResetPassword.jsx](../../src/pages/ResetPassword.jsx)로 이동해 새 비밀번호를 입력하게 됩니다.

이 주소가 **Redirect URLs에 등록되어 있어야** 합니다. Authentication → URL Configuration에서 아래 두 개를 추가해 주세요.

- `https://배포주소/reset-password`
- `http://localhost:5173/reset-password` (개발용)

등록되지 않은 주소로는 Supabase가 되돌려 보내주지 않고 Site URL로 보내버립니다.

## Resend를 SMTP로 연결하기

Authentication → Emails → **SMTP Settings**에서 Enable Custom SMTP를 켜고 아래처럼 입력합니다.

| 항목 | 값 |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` (고정값, 계정 이메일이 아님) |
| Password | Resend API 키 (`re_`로 시작) |
| Sender email | 아래 설명 참고 |
| Sender name | `PLANSCHOOL` |

저장한 뒤 Authentication → **Rate Limits**에서 시간당 발송량을 올려주세요. 기본 2통에서 100통 정도면 충분합니다.

### API 키는 절대 앱 코드에 넣지 마세요

Resend API 키는 **Supabase 대시보드에만** 넣습니다. `.env`에 넣으면 안 됩니다.

Vite는 `VITE_`로 시작하는 값을 **빌드 결과물에 그대로 박아 넣기 때문에**, 브라우저 개발자도구에서 누구나 볼 수 있습니다. 그 키로 아무나 우리 계정으로 메일을 보낼 수 있게 됩니다. 메일 발송은 Supabase 서버가 대신 처리하므로 앱 코드에는 키가 필요 없습니다.

### 보내는 주소(Sender email) 주의

도메인을 인증하기 전에는 `onboarding@resend.dev`를 쓸 수 있지만, 이 주소는 **Resend 계정 주인의 이메일로만 발송됩니다.** 다른 사람에게는 메일이 가지 않습니다.

즉 혼자 테스트할 때는 괜찮지만, **선생님들께 배포하기 전에는 반드시 도메인을 인증**해야 합니다. Resend의 Domains 메뉴에서 도메인을 추가하고 안내되는 DNS 레코드를 등록한 뒤, Sender email을 `noreply@내도메인` 형태로 바꾸면 됩니다.

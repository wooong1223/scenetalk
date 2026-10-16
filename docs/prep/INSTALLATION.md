# 설치 및 확인 기록

작업일: 2026-10-15 (Asia/Seoul)

| 항목 | 확인 버전 / 상태 |
|---|---|
| Antigravity 앱 | 2.0.10 → **2.23.1** 업데이트, 전체 코드 서명 검증 통과 |
| Antigravity CLI | **1.3.5** 설치, `agy --version` 실행 통과 |
| Antigravity Gemini 플러그인 | **2.2.0**, 활성화됨; API / Live / Omni Flash 스킬 3개 |
| Google Cloud CLI | **589.0.0** 설치, 버전 명령 정상 |
| GitHub CLI | **2.102.0** 설치, 버전 명령 정상; 아직 로그인하지 않음 |
| JavaScript Gemini SDK | **@google/genai 2.30.0**, Interactions / Live 인터페이스 점검 통과 |
| Python Gemini SDK | **google-genai 2.31.0**, 전용 `.venv`, Interactions / Live 인터페이스 점검 통과 |
| TypeScript / tsx | **7.0.2 / 4.23.15** 설치 |
| Codex 사용자 스킬 | gemini-api-dev, gemini-live-api-dev 설치; 다음 턴부터 사용 가능 |
| 기존 도구 | Node.js 26.0.0, npm 11.12.1, Python 3.13.7, Git 2.51.0 확인 |
| 기존 브라우저 | Chrome 155.0.8059.40 확인 |

## 검증

- 최신 Antigravity 앱은 공식 Google 배포 DMG에서 가져와 `/Applications/Antigravity.app`에 설치했습니다. Homebrew의 DMG 해제 단계가 지연되어 중단한 뒤, 서명을 검증한 앱으로 직접 설치했습니다. **Antigravity 앱은 Homebrew 관리 설치로 등록하지 않았습니다.**
- CLI 압축 파일의 SHA-512가 공식 배포 manifest와 일치했고, 시스템 환경에서 Google 코드 서명 검증을 통과했습니다. `~/.local/bin/agy`에 설치했으며 기존 PATH에서 실행됩니다. 보안 설정이나 Gatekeeper를 변경하지 않았습니다.
- Google Cloud CLI와 GitHub CLI는 Homebrew로 설치했습니다. 이 과정에서 Homebrew가 필요한 Python 3.13 및 관련 의존성을 설치/업데이트했습니다.
- SDK 점검은 import 및 클라이언트 인터페이스만 확인했습니다. 실제 모델 API 호출, 계정 권한 검증, Cloud 배포는 하지 않았습니다.
- npm 설치 시 의존성 취약점 보고는 0건이었고, Python `pip check`도 통과했습니다.
- 자동 점검 보고서는 `reports/preflight-latest.txt`와 `.json`입니다. `집에서-점검.command`를 실행하면 갱신됩니다.
- 최종 자동 점검: **15개 통과, 0개 실패**. 소스 백업 도구도 샘플 파일로 확인하여 `.env`, 키 파일, `node_modules`가 제외됨을 검증했습니다.
- 설치 이미지의 가상 디스크 해제는 macOS DiskArbitration 응답 지연으로 완료되지 않았습니다. 응답 없는 작업은 종료했습니다. 집에서 잠금을 해제한 뒤 Finder에 Antigravity 설치 디스크가 남아 있으면 꺼내면 됩니다. 설치된 앱은 해당 이미지와 별도로 `/Applications`에 있습니다.

## 집에서 직접 확인

1. Mac이 잠겨 있어 **Antigravity 실행 화면은 확인하지 못했습니다.** 앱을 열어 환영/로그인 화면이 표시되는지 확인하세요.
2. 개인 GitHub 로그인: `gh auth login --hostname github.com --git-protocol https --web` → `gh auth status`.
3. 화면 녹화·마이크 권한 및 재생: `Shift + Command + 5`로 짧게 녹화해서 확인하세요.

## 내일 계정 수령 후 확인

- `@gcplab.me` 계정과 배정된 Project ID 연결.
- Antigravity의 Use business account → Project ID → Agent Platform 플랜 확인.
- AI Studio API 키, 실제 모델 접근, 첫 API 호출, Google Cloud 배포 확인.

## 보관 위치

- SDK 의존성: 이 폴더의 `node_modules`, `.venv`.
- 재설치용 의존성 고정 기록: `package-lock.json`, `requirements.lock.txt`.
- 이전 앱 백업: `.install-backups/Antigravity-2.0.10.app`.
- 공식 가이드 오프라인 텍스트 사본: `source-guide.md` (현장 공지와 최신 원문이 우선).
- 영어 제출물 빈 목차: `submission-outline.md`.
- 프로젝트 소스 백업 도구: `scripts/backup-project.sh`.

출품용 앱/시연 코드, 개인 결제 설정, 클라우드 프로젝트·서비스·공개 GitHub 저장소는 만들지 않았습니다.

## 준비 폴더 이동 (20261015-234946)

- 새 위치: `/Users/jimmy/gdm_ai_hackathon`.
- 기존 위치에 폴더나 심볼릭 링크를 남기지 않았습니다.
- 기존 Python 패키지 버전과 pip 버전을 유지해 새 경로에 가상환경을 재생성했습니다.
- 이전 가상환경 보관: `.install-backups/venv-before-move-20261015-234946`. 복구용이며 직접 활성화하지 마세요.
- README 경로와 자동 점검 보고서를 갱신했고, 가상환경 활성화·pip·TypeScript 실행·점검 실행 파일 권한을 확인했습니다.
- 이동 후 자동 점검: 15개 통과, 0개 실패.

## 준비 폴더 이름 변경 (20261015-235642)

- 새 위치: `/Users/jimmy/gdm_ai_hackathon`.
- 기존 위치에 폴더나 심볼릭 링크를 남기지 않았습니다.
- 기존 Python 패키지 버전과 pip 버전을 유지해 새 경로에 가상환경을 재생성했습니다.
- 이전 가상환경 보관: `.install-backups/venv-before-move-20261015-235642`. 복구용이며 직접 활성화하지 마세요.
- README 경로와 자동 점검 보고서를 갱신했고, 가상환경 활성화·pip·TypeScript 실행·점검 실행 파일 권한을 확인했습니다.
- 이동 후 자동 점검: 15개 통과, 0개 실패.

# GitHub Sync & Project Management Directive

## 목적 (Goal)
이 지침은 사용자가 새로운 파일(코드, 도구 등)을 제공했을 때, 이를 분석하여 적절한 프로젝트 폴더(`repositories/` 내부)로 분류하고, 버전을 관리하며, 최종적으로 GitHub에 동기화(Commit & Push)하는 에이전트의 행동 강령입니다.

## 작동 방식 (Workflow)

사용자가 새로운 도구나 코드들을 `inbox/` 폴더에 넣어두면, 이 파일들을 대상으로 다음 순서루 작업을 수행하세요.

### 1단계: 프로젝트 분류 및 버전 결정 (Analysis)
1. **파일 분석**: `inbox/` 폴더 내에 담겨진 제공받은 파일의 목적, 기능, 사용 언어 등을 분석합니다.
2. **기존 프로젝트 검색**: `repositories/` 폴더 내에 있는 기존 프로젝트 디렉토리들의 메타데이터(README 등)를 읽어 이 파일과 목적이 유사한 프로젝트가 있는지 확인합니다.
3. **분류 결정**:
   - **새 프로젝트**: 기존 프로젝트와 연관성이 낮다면, 새로운 프로젝트 이름을 작명합니다 (예: `web_scraper_agent`). 시작 버전은 `v1.0` 입니다.
   - **기존 프로젝트 (버전업)**: 기존 프로젝트(예: `github_sync_agent`)와 목적이 동일하거나 확장하는 기능이라면, 해당 프로젝트의 버전을 올립니다. 
     - *버전 규칙*: 단순 버그 수정이나 소규모 추가는 패치(`v1.x -> v1.(x+1)`), 주요 기능 변경/추가는 마이너/메이저 버전을 활용하세요 (예: `v1.1`, `v2.0`).

### 2단계: 파일 정리 및 메타데이터 생성 (Execution - manage_repository)
분류가 완료되면 `execution/manage_repository.py` 스크립트를 호출하여 파일 시스템 구조를 제어합니다.

* **입력 매개변수**:
  - `project_name`: 프로젝트 폴더 이름
  - `version`: 결정된 버전 (예: `v1.0`)
  - `files_to_copy`: 이동/저장할 원본 파일 경로 목록 또는 파일 생성 지시
  - `msg_or_desc`: 해당 버전에 대한 설명 및 새로운 기능 요약 텍스트 (이 내용은 CHANGELOG.md로 렌더링 됩니다)
* **기대 결과**: `repositories/<project_name>/<version>/` 경로에 소스코드와 표준 `CHANGELOG.md`가 올바르게 위치해야 합니다.

### 3단계: GitHub 동기화 (Execution - sync_to_github)
파일 정리가 끝나면 Git을 통해 버전을 확정하고 리모트 저장소에 업로드합니다. `execution/sync_to_github.py` 스크립트를 호출합니다.

* **기대 결과**: 스크립트가 내부적으로 `repositories/` 폴더만을 대상으로 `git add` 처리하고 브랜치를 직관적으로 `main`으로 통일시킨 후 `git commit`, `git push`를 처리합니다. 에이전트는 불필요한 스크립트가 올라가지 않도록 이 스크립트만 신뢰하여 실행합니다.

## 시스템 제약 및 예외 처리 (Self-Annealing)
1. 스크립트(`manage_repository.py` 또는 `sync_to_github.py`) 실행 중 에러(예: Git 충돌, 폴더 권한 오류)가 발생하면:
   - 에러 메시지를 기반으로 원인을 파악합니다.
   - 스크립트 로직에 문제가 있다면 스크립트를 수정(Fix)하고 다시 테스트합니다.
   - 스스로 해결할 수 없는 권한/네트워크(Token 만료 등) 문제라면 사용자에게 즉시 알리고 조치를 요청합니다.
2. `.tmp/` 경로의 파일은 절대 GitHub 동기화 대상에 포함시키지 않습니다.

## 사용할 도구 (Tools to use)
- `execution/manage_repository.py`: 파일 분류, 디렉토리 생성 및 코드 저장
- `execution/sync_to_github.py`: Git Add, Commit, Push 실행

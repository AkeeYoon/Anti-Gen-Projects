# GitHub Sync & Project Management Directive

## 목적 (Goal)
이 지침은 사용자가 새로운 파일(코드, 도구 등)을 제공했을 때, 이를 분석하여 적절한 프로젝트 폴더(`repositories/` 내부)로 분류하고, 버전을 관리하며, 최종적으로 GitHub에 동기화(Commit & Push)하는 에이전트의 행동 강령입니다.

## 작동 방식 (Workflow)

사용자가 새로운 도구나 코드들을 `inbox/` 폴더에 넣어두면, 이 파일들을 대상으로 다음 순서루 작업을 수행하세요.

### 1단계: 프로젝트 분류 및 버전 결정 (Analysis)
1. **파일 분석**: `inbox/` 폴더 내에 담겨진 제공받은 파일의 목적, 기능, 사용 언어 등을 분석합니다.
2. **기존 프로젝트 및 중복 검사 (Phase 4)**: 
   - 기존의 `repositories/` 폴더를 기준으로 `execution/check_duplicate.py --project <프로젝트명> --files <inbox 경로>` 스크립트를 우선 실행합니다.
   - **출력이 `DUPLICATE`일 경우**: 100% 파일 구조와 내용이 동일한 중복 파일이므로, **절대로 버전을 올리지 않고 파일 분류를 즉각 중단(Drop)** 합니다. `inbox` 폴더 내의 해당 타겟만 조용히 삭제하고 넘어가세요.
   - **출력이 `CHANGED` 또는 `NEW_PROJECT`일 경우**: 정상적인 새 릴리즈나 업데이트이므로 다음 단계를 진행합니다.
3. **분류 결정**:
   - **새 프로젝트**: 기존 프로젝트와 연관성이 낮다면, 새로운 프로젝트 이름을 작명합니다 (예: `web_scraper_agent`). 시작 버전은 `v1.0` 입니다.
   - **기존 프로젝트 (버전업)**: `CHANGED`로 판정된 경우, 파일 내용에 변경점이 있으므로 해당 프로젝트의 버전을 올립니다. 
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

* **입력 매개변수**:
  - `commit_message`: "feat: <project_name> <version> - <변경내용 요약>" 형태의 명확한 메시지를 전달.
  - `path`: (매우 중요) 전역 폴더가 올라가는 것을 방지하기 위해 **방금 생성한 특정 프로젝트 경로(예: `repositories/ServerNet`)**를 인자로 명시적으로 전달합니다. (예: `-p repositories/ServerNet`)
  - `branch`: **(필수 - Phase 5)** 안전한 버저닝을 위해 항상 메인 브랜치가 아닌 격리된 서브 브랜치를 타겟합니다. 규칙은 `feat/<프로젝트명>_<버전>` 형식을 따릅니다. (예: `-b feat/ServerNet_v1.0`)
* **기대 결과**: 스크립트가 내부적으로 전달된 특정 폴더만을 대상으로 `git add` 처리하고, 전달된 `branch`로 브랜치를 전환(`checkout -B`)한 후, 해당 `branch`로 `git push`를 처리합니다. 
* **주의**: 사용자가 명시적으로 `main`으로 밀어올리라고 지시하지 않는 이상, 에이전트는 **절대 `main` 브랜치에 직접 푸시하지 않습니다.**

## 시스템 제약 및 예외 처리 (Self-Annealing)
1. 스크립트(`manage_repository.py` 또는 `sync_to_github.py`) 실행 중 에러(예: Git 충돌, 폴더 권한 오류)가 발생하면:
   - 에러 메시지를 기반으로 원인을 파악합니다.
   - 스크립트 로직에 문제가 있다면 스크립트를 수정(Fix)하고 다시 테스트합니다.
   - 스스로 해결할 수 없는 권한/네트워크(Token 만료 등) 문제라면 사용자에게 즉시 알리고 조치를 요청합니다.
2. `.tmp/` 경로의 파일은 절대 GitHub 동기화 대상에 포함시키지 않습니다.

## 사용할 도구 (Tools to use)
- `execution/manage_repository.py`: 파일 분류, 디렉토리 생성 및 코드 저장
- `execution/sync_to_github.py`: Git Add, Commit, Push 실행

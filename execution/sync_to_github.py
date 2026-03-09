import subprocess
import sys
import os

def run_git_command(command, cwd=None):
    """Git 명령어 실행 헬퍼 함수"""
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            text=True,
            capture_output=True,
            check=True
        )
        if result.stdout:
            print(result.stdout.strip())
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Git 명령어 에러: {' '.join(command)}", file=sys.stderr)
        print(f"상세 에러:\n{e.stderr}", file=sys.stderr)
        return False, e.stderr

def load_env(env_path):
    """기본적인 .env 파일 파싱 헬퍼"""
    env_vars = {}
    if os.path.exists(env_path):
        content = ""
        for enc in ['utf-8', 'utf-16', 'utf-8-sig']:
            try:
                with open(env_path, 'r', encoding=enc) as f:
                    content = f.read()
                break
            except UnicodeError:
                continue
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

def sync_to_github(commit_message):
    """변경사항을 로컬에 add & commit 하고 원격에 설정된 저장소로 push 담당."""
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir) # c:/Users/D30/.gemini/githubAgent
    env_path = os.path.join(base_dir, ".env")
    
    # 환경 변수 로드
    env_vars = load_env(env_path)
    github_token = env_vars.get("GITHUB_TOKEN")
    github_repo_url = env_vars.get("GITHUB_REPO_URL")
    
    print(f"작업 디렉토리: {base_dir}")

    # Git init 상태 체크 및 초기화
    success, stdout = run_git_command(["git", "status"], cwd=base_dir)
    if not success:
        print("Git 저장소가 아닙니다. `git init`을 자동으로 수행합니다.", file=sys.stderr)
        # 자동으로 git init 시도
        init_success, _ = run_git_command(["git", "init"], cwd=base_dir)
        if not init_success:
            sys.exit(1)
            
    # 원격 저장소 및 토큰 설정
    if github_token and github_repo_url:
        print("\n--- 0. GitHub 인증 토큰 및 원격 저장소 설정 ---")
        # https://github.com/user/repo.git 형태의 URL을 https://<token>@github.com/user/repo.git 형태로 변환
        if "://" in github_repo_url:
            protocol, rest = github_repo_url.split("://", 1)
            auth_url = f"{protocol}://{github_token}@{rest}"
            
            # 기존 origin이 있는지 확인하고 업데이트
            success, remotes = run_git_command(["git", "remote", "-v"], cwd=base_dir)
            if remotes and "origin" in remotes:
                run_git_command(["git", "remote", "set-url", "origin", auth_url], cwd=base_dir)
            else:
                run_git_command(["git", "remote", "add", "origin", auth_url], cwd=base_dir)
        else:
             print("경고: GITHUB_REPO_URL이 올바른 HTTP/HTTPS 형식이 아닙니다.", file=sys.stderr)

    print("\n--- 1. 변경사항 추가 (git add repositories/) ---")
    run_git_command(["git", "add", "repositories/"], cwd=base_dir)

    print("\n--- 2. 변경사항 커밋 (git commit) ---")
    success, _ = run_git_command(["git", "commit", "-m", commit_message], cwd=base_dir)
    if not success:
        print("\n커밋할 변경사항이 없거나 에러가 발생했습니다.")
        # 변경할게 없을때는 에러가 아니므로 정상 종료로 간주
        sys.exit(0)
        
    print("\n--- 3. 메인 브랜치명 통일 (git branch -M main) ---")
    run_git_command(["git", "branch", "-M", "main"], cwd=base_dir)

    print("\n--- 4. 변경사항 푸시 (git push) ---")
    # 기본적인 push (처음엔 푸시가 실패할 수 있으므로 upstream 설정 추가)
    success, output = run_git_command(["git", "push", "-u", "origin", "main"], cwd=base_dir)
        
    if success:
        print("\n[OK] 성공적으로 GitHub에 동기화(Push) 되었습니다!")
    else:
        print("\n[FAIL] Push 실패. 원격 저장소 연결을 확인하거나('git remote -v'), 처음 Push할 경우 'git push -u origin <branch>'가 필요합니다.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Git 추가, 커밋, 푸시 통합 스크립트")
    parser.add_argument("--message", "-m", required=True, help="Git 커밋 메시지")

    args = parser.parse_args()
    sync_to_github(args.message)

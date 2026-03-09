import sys
import os
import shutil
import json

from datetime import datetime

def get_base_dir():
    """
    환경변수 또는 스크립트 위치를 기준으로 기준 디렉토리를 가져옵니다.
    기본값은 이 스크립트 경로의 상위인 githubAgent/ 입니다.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # execution/ 의 상위 디렉터리 반환
    return os.path.dirname(script_dir)

def manage_repository(project_name, version, source_files, readme_content=None, changelog_content=None):
    """
    주어진 파일들을 `repositories/<project_name>/<version>/`으로 복사합니다.
    """
    base_dir = get_base_dir()
    repo_base = os.environ.get("REPOSITORIES_DIR", os.path.join(base_dir, "repositories"))
    target_dir = os.path.join(repo_base, project_name, version)

    print(f"[{project_name} - {version}] 디렉토리 준비 중: {target_dir}")
    os.makedirs(target_dir, exist_ok=True)

    # 1. 파일 복사
    copied_files = []
    if source_files:
        for src_file in source_files:
            if not os.path.exists(src_file):
                print(f"경고: 소스 파일을 찾을 수 없습니다: {src_file}", file=sys.stderr)
                continue
            
            dest_file = os.path.join(target_dir, os.path.basename(src_file))
            try:
                # 파일이면 copy2 (메타데이터 유지), 디렉터리이면 copytree
                if os.path.isdir(src_file):
                    if os.path.exists(dest_file):
                        shutil.rmtree(dest_file)
                    shutil.copytree(src_file, dest_file)
                else:
                    shutil.copy2(src_file, dest_file)
                copied_files.append(dest_file)
                print(f"[OK] 복사 완료: {os.path.basename(src_file)}")
            except Exception as e:
                print(f"오류: {src_file} 복사 실패. ({e})", file=sys.stderr)
                sys.exit(1)

    # 2. README 생성 (선택 사항)
    if readme_content:
        readme_path = os.path.join(target_dir, "README.md")
        try:
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(readme_content)
            print("[OK] README.md 생성 완료")
        except Exception as e:
            print(f"오류: README.md 생성 실패. ({e})", file=sys.stderr)

    # 3. CHANGELOG 생성 (선택 사항)
    if changelog_content:
        # 프로젝트 루트 디렉토리(version 폴더의 상위)에 CHANGELOG.md 생성/업데이트
        project_root = os.path.join(repo_base, project_name)
        changelog_path = os.path.join(project_root, "CHANGELOG.md")
        date_str = datetime.now().strftime("%Y-%m-%d")
        
        mode = "a" if os.path.exists(changelog_path) else "w"
        try:
            with open(changelog_path, mode, encoding="utf-8") as f:
                if mode == "w":
                    f.write(f"# Changelog ({project_name})\n\n")
                
                f.write(f"## [{version}] - {date_str}\n")
                f.write(f"{changelog_content}\n\n")
            print("[OK] CHANGELOG.md 업데이트 완료")
        except Exception as e:
            print(f"오류: CHANGELOG.md 업데이트 실패. ({e})", file=sys.stderr)

    print(f"성공: {project_name}({version}) 관리 완료. 총 {len(copied_files)}개 항목 복사됨.")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="프로젝트 폴더 생성 및 소스 파일 관리 스크립트")
    parser.add_argument("--project", required=True, help="프로젝트 이름 (예: my_agent)")
    parser.add_argument("--version", required=True, help="버전 (예: v1.0)")
    parser.add_argument("--files", nargs="*", default=[], help="이동/복사할 원본 파일/폴더 경로 리스트")
    parser.add_argument("--readme", type=str, help="프로젝트에 추가할 README.md 내용 (선택사항)")
    parser.add_argument("--changelog", type=str, help="CHANGELOG.md에 추가할 변경사항 요약 리스트 (선택사항)")

    args = parser.parse_args()
    
    manage_repository(args.project, args.version, args.files, args.readme, args.changelog)

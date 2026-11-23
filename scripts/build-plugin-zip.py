"""NS홈쇼핑 Claude 플러그인 업로드용 ZIP 생성.

사용법:  python scripts/build-plugin-zip.py
결과물:  dist/nsmall-shopping-<버전>.zip
         (ZIP 루트에 .claude-plugin/plugin.json 이 오도록 압축합니다)

claude.ai / Claude 데스크톱 앱: 사용자 지정(Customize) > 플러그인 > 추가 > "플러그인 업로드"
Claude Code 로컬 테스트:        claude --plugin-dir dist/nsmall-shopping-<버전>.zip
"""
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLUGIN = ROOT / "nsmall-shopping"
DIST = ROOT / "dist"

EXCLUDE_DIRS = {"node_modules", ".git", "__pycache__", "dist", "evals"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db", ".env"}
MAX_FILES = 5000              # claude.ai 업로드 한도
MAX_BYTES = 200 * 1024 * 1024  # 200MB


def collect():
    files = []
    for p in sorted(PLUGIN.rglob("*")):
        rel = p.relative_to(PLUGIN)
        if p.is_dir() or any(part in EXCLUDE_DIRS for part in rel.parts) or p.name in EXCLUDE_FILES:
            continue
        files.append((p, rel.as_posix()))
    return files


def check(manifest, files):
    errors = []
    names = {rel for _, rel in files}
    for required in (".claude-plugin/plugin.json", ".mcp.json", "README.md", "LICENSE"):
        if required not in names:
            errors.append(f"필수 파일 없음: {required}")
    if any(rel.startswith("bin/") for rel in names):
        errors.append("최상위 bin/ 폴더는 claude.ai 업로드에서 거부됩니다")
    if len(files) > MAX_FILES:
        errors.append(f"파일 수 {len(files)}개 > {MAX_FILES}개")
    for key in ("name", "version", "description", "license"):
        if not manifest.get(key):
            errors.append(f"plugin.json에 '{key}' 없음")
    icon = manifest.get("icon")
    if icon and icon.removeprefix("./") not in names:
        errors.append(f"아이콘 파일 없음: {icon}")
    for p, rel in files:
        if p.suffix.lower() not in {".png", ".jpg", ".jpeg", ".svg", ".webp"} and p.stat().st_size > 256 * 1024:
            print(f"  [주의] 256KiB 초과 파일은 디렉터리 리뷰가 지연됩니다: {rel}")
    return errors


def main():
    manifest = json.loads((PLUGIN / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    files = collect()
    errors = check(manifest, files)
    if errors:
        print("ZIP을 만들 수 없습니다:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)

    DIST.mkdir(exist_ok=True)
    out = DIST / f"{manifest['name']}-{manifest['version']}.zip"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p, rel in files:
            z.write(p, rel)

    size = out.stat().st_size
    if size > MAX_BYTES:
        print(f"ZIP 크기 {size:,}바이트가 200MB를 넘습니다")
        sys.exit(1)
    print(f"생성 완료: {out.relative_to(ROOT)}  ({len(files)}개 파일, {size:,}바이트)")
    for _, rel in files:
        print(f"  {rel}")


if __name__ == "__main__":
    main()

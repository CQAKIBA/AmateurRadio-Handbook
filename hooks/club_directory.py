"""Build the clubs directory from Git commit timestamps.

All club articles are listed together. Club activity/status is not inferred.
"""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
import re
import subprocess
from zoneinfo import ZoneInfo

MARKER = "<!-- CLUB_DIRECTORY -->"
JST = ZoneInfo("Asia/Tokyo")


def _last_modified(repo_root: Path, file_path: Path) -> int | None:
    """Last Git commit that changed the file (not filesystem mtime)."""
    relative = file_path.relative_to(repo_root).as_posix()
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", relative],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        return None
    timestamp = result.stdout.strip()
    return int(timestamp) if result.returncode == 0 and timestamp.isdigit() else None


def _club_title(file_path: Path) -> str:
    content = file_path.read_text(encoding="utf-8-sig")
    match = re.search(r"^#\s+(.+?)\s*$", content, re.MULTILINE)
    return match.group(1) if match else file_path.stem


def on_page_markdown(markdown: str, page, config, **kwargs) -> str:
    if page.file.src_path.replace("\\", "/") != "clubs/index.md":
        return markdown
    if MARKER not in markdown:
        return markdown

    docs_dir = Path(config["docs_dir"]).resolve()
    repo_root = docs_dir.parent
    club_dir = docs_dir / "clubs"
    entries = []
    for path in club_dir.rglob("*.md"):
        if path.name == "index.md" or path.name.startswith("_"):
            continue
        title = _club_title(path)
        # Show the shorter name in the compact list, while preserving the
        # complete article title inside the article itself.
        short_title = title.split("（", 1)[0].strip()
        url = path.relative_to(club_dir).as_posix()
        entries.append((short_title, url, _last_modified(repo_root, path)))

    # Unknown timestamps go last, then alphabetical order for stable ties.
    entries.sort(key=lambda e: (e[2] is None, -(e[2] or 0), e[0].casefold()))

    if not entries:
        content = "掲載されているクラブ・サークルはありません。"
    else:
        lines = []
        for title, url, timestamp in entries:
            date = (
                datetime.fromtimestamp(timestamp, JST).strftime("%Y-%m-%d")
                if timestamp is not None
                else "更新日未取得"
            )
            lines.append(f"- **[{title}]({url})** — 記事更新：{date}")
        content = "\n".join(lines)

    return markdown.replace(MARKER, content)

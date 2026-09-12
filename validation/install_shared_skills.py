"""Install portable shared skills for verify freshness hashing.

Reads validation/development-workflow.json sharedSkills roots and, when a
canonical portable archive is present, extracts it into ~/.agents/skills
after verifying archive and file SHA-256 digests. No network. No mocks.
"""
from __future__ import annotations

import hashlib
import json
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'validation/development-workflow.json'
MANIFEST = ROOT / 'validation/development-portable-package-manifest.json'
ARCHIVE = ROOT / 'validation/development-ai-native-sdlc-v2.0.0.zip'
DEST_PARENT = Path.home() / '.agents' / 'skills'


def sha256(path: Path) -> str:
    """Return hex SHA-256 of a file.

    Args:
        path: Absolute or relative file path to hash.

    Returns:
        Lowercase hex digest string.

    Raises:
        OSError: If the file cannot be read.
    """
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_json(path: Path) -> dict:
    """Load a UTF-8 JSON object from disk.

    Args:
        path: JSON file path.

    Returns:
        Parsed dictionary.

    Raises:
        ValueError: If content is not a JSON object.
        OSError: If the file cannot be read.
    """
    value = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(value, dict):
        raise ValueError(f'expected object: {path}')
    return value


def install_ai_native_sdlc() -> Path:
    """Install ai-native-sdlc from the portable archive with digest checks.

    Returns:
        Absolute installed skill root.

    Raises:
        ValueError: On digest mismatch or incomplete package.
        OSError: On filesystem failures.
    """
    manifest = load_json(MANIFEST)
    archive_digest = sha256(ARCHIVE)
    expected_archive = manifest.get('archiveSha256')
    if archive_digest != expected_archive:
        raise ValueError(
            f'portable archive digest mismatch: got {archive_digest}'
        )
    DEST_PARENT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ARCHIVE) as zf:
        members = [
            name for name in zf.namelist()
            if name.startswith('ai-native-sdlc/') and not name.endswith('/')
        ]
        if not members:
            raise ValueError('portable archive missing ai-native-sdlc/ members')
        for name in members:
            zf.extract(name, DEST_PARENT)
    skill_root = (DEST_PARENT / 'ai-native-sdlc').resolve()
    files = manifest.get('files', {})
    if not isinstance(files, dict) or not files:
        raise ValueError('portable manifest missing files map')
    for relative, expected in files.items():
        path = skill_root / relative
        if not path.is_file():
            raise ValueError(f'missing installed skill file: {relative}')
        got = sha256(path)
        if got != expected:
            raise ValueError(f'skill file digest mismatch: {relative}')
    return skill_root


def required_roots() -> list[Path]:
    """Return absolute shared skill roots declared by the workflow config.

    Returns:
        List of expanded absolute Path roots.

    Raises:
        ValueError: If config is missing or roots are invalid strings.
    """
    cfg = load_json(CONFIG)
    skills = cfg.get('sharedSkills', [])
    roots: list[Path] = []
    for skill in skills:
        raw = skill.get('root', '')
        if not isinstance(raw, str) or not raw:
            raise ValueError('shared skill root must be a non-empty string')
        roots.append(Path(raw).expanduser())
    return roots


def main() -> int:
    """Install missing shared skills then confirm all declared roots exist.

    Returns:
        Process exit code: 0 on success, 2 on failure.
    """
    try:
        roots = required_roots()
        missing = [p for p in roots if not p.is_dir()]
        if missing:
            if any(p.name == 'ai-native-sdlc' for p in missing):
                installed = install_ai_native_sdlc()
                print(f'installed shared skill: {installed}')
            missing = [p for p in required_roots() if not p.is_dir()]
        if missing:
            raise ValueError(
                'shared skill roots still missing: '
                + ', '.join(str(p) for p in missing)
            )
        for root in required_roots():
            print(f'shared skill ready: {root.resolve()}')
        return 0
    except (ValueError, KeyError, TypeError, OSError, zipfile.BadZipFile) as e:
        print(f'INSTALL_SHARED_SKILLS_ERROR: {e}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())

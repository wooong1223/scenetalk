#!/usr/bin/env python3
"""Check the installed preparation environment without calling paid APIs."""
import datetime
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
os.environ["PATH"] = os.pathsep.join([
    str(Path.home() / ".local/bin"), "/opt/homebrew/bin",
    "/opt/homebrew/share/google-cloud-sdk/bin", os.environ.get("PATH", "")
])
os.environ["CLOUDSDK_CORE_DISABLE_USAGE_REPORTING"] = "true"
os.environ["CLOUDSDK_COMPONENT_MANAGER_DISABLE_UPDATE_CHECK"] = "true"
results = []

def record(name, status, detail):
    results.append({"name": name, "status": status, "detail": detail})
    print(f"[{status}] {name}: {detail}", flush=True)

def run_check(name, argv):
    try:
        proc = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, timeout=45)
        if proc.returncode:
            record(name, "FAIL", (proc.stderr or proc.stdout).strip()[-500:])
        else:
            record(name, "PASS", proc.stdout.strip()[:800])
    except (OSError, subprocess.TimeoutExpired) as exc:
        record(name, "FAIL", str(exc))

print("Google DeepMind 해커톤 준비 환경 점검 (유료 API 호출 없음)\n", flush=True)
for label, app in [("Antigravity", "/Applications/Antigravity.app"), ("Google Chrome", "/Applications/Google Chrome.app")]:
    info = Path(app) / "Contents/Info.plist"
    if info.exists():
        with info.open("rb") as stream:
            metadata = plistlib.load(stream)
        record(label, "PASS", metadata.get("CFBundleShortVersionString", "installed"))
    else:
        record(label, "FAIL", "앱이 설치되어 있지 않습니다.")

for name, args in [("Node.js", ["node", "--version"]), ("npm", ["npm", "--version"]),
                   ("Python", ["python3", "--version"]), ("Git", ["git", "--version"]),
                   ("GitHub CLI", ["gh", "--version"]), ("Google Cloud CLI", ["gcloud", "version", "--format=json"]),
                   ("Antigravity CLI", ["agy", "--version"])]:
    if shutil.which(args[0]):
        run_check(name, args)
    else:
        record(name, "FAIL", "명령어를 찾을 수 없습니다.")

run_check("JavaScript Gemini SDK (Interactions/Live)", ["node", "scripts/check-node-sdk.mjs"])
run_check("Python Gemini SDK (Interactions/Live)", [str(ROOT / ".venv/bin/python"), "scripts/check-python-sdk.py"])
run_check("Python dependency consistency", [str(ROOT / ".venv/bin/python"), "-m", "pip", "check", "--disable-pip-version-check"])
run_check("Antigravity Gemini plugin", [str(Path.home() / ".local/bin/agy"), "plugin", "list", "--json"])
for skill in ["gemini-api-dev", "gemini-live-api-dev"]:
    target = Path.home() / ".codex/skills" / skill / "SKILL.md"
    record(f"Codex skill: {skill}", "PASS" if target.is_file() else "FAIL", str(target))

for label, detail in [
    ("Antigravity 앱 화면", "집에서 앱을 열어 환영/로그인 화면 확인 (앱 설치·서명 검증 완료)"),
    ("개인 GitHub 로그인", "집에서 gh auth login 후 gh auth status 확인"),
    ("화면 녹화 및 마이크", "집에서 Shift+Command+5로 짧게 녹화하고 소리 재생 확인"),
    ("행사 계정 및 API", "내일 @gcplab.me 계정 수령 후 로그인, API 호출, Cloud 배포 확인"),
]:
    record(label, "MANUAL", detail)

report_dir = ROOT / "reports"
report_dir.mkdir(exist_ok=True)
stamp = datetime.datetime.now().astimezone().isoformat()
payload = {"checked_at": stamp, "checks": results, "network_api_calls": 0}
(report_dir / "preflight-latest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
(report_dir / "preflight-latest.txt").write_text(stamp + "\n" + "\n".join(f"[{r['status']}] {r['name']}: {r['detail']}" for r in results) + "\n")
failed = sum(item["status"] == "FAIL" for item in results)
manual = sum(item["status"] == "MANUAL" for item in results)
print(f"\n자동 점검 실패: {failed}개. 수동 점검 {manual}개는 README를 참고하세요.")
sys.exit(1 if failed else 0)

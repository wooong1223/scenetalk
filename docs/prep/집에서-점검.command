#!/bin/zsh
cd "${0:A:h}"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
python3 scripts/preflight.py
result=$?
print '\n상세 준비 안내: 이 폴더의 README.md'
print '종료하려면 Enter를 누르세요.'
read -r
exit "$result"

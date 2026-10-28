#!/bin/bash
# Self-test report for CI: prints it, turns it into annotations (readable without the raw logs),
# and fails the step unless the app reported OK.  Usage: report.sh <report file> <app log> <label>
report="$1"; log="$2"; label="$3"
if [ -f "$report" ] && [ "$(head -1 "$report")" = "OK" ]; then
  echo "::notice title=$label self-test::$(tr '\n' ' ' < "$report")"
  exit 0
fi
echo "::error title=$label self-test failed::$( [ -f "$report" ] && tr '\n' ' ' < "$report" | cut -c1-900 || echo 'no report written')"
[ -f "$log" ] && tail -25 "$log" | grep -v '^\s*$' | tail -15 | while IFS= read -r l; do echo "::warning title=$label app output::${l:0:300}"; done
exit 1

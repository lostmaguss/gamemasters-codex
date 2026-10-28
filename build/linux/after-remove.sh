#!/bin/bash

# Delete the link to the binary
if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --remove '${executable}' '/usr/bin/${executable}'
else
    rm -f '/usr/bin/${executable}'
fi

if [ -f /etc/apparmor.d/gamemasters-codex ]; then
  hash apparmor_parser 2>/dev/null && apparmor_parser --remove /etc/apparmor.d/gamemasters-codex 2>/dev/null || true
  rm -f /etc/apparmor.d/gamemasters-codex
fi

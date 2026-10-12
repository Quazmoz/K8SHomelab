#!/bin/sh
# Run from the homelab checkout in your own terminal; Claude authorization needs the account owner.
set -eu
exec kubectl --context homelab exec -it -n apps deployment/paperclip -c paperclip -- \
  gosu node node --import /app/server/node_modules/tsx/dist/loader.mjs \
  /paperclip/claude-auth-repair-2026-10-12/operator.mjs claude-reconnect

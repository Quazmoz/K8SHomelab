#!/bin/sh
# OpenClaw post-deploy smoke tests
# Run via: kubectl -n apps exec -i deploy/openclaw -c openclaw -- sh < test_openclaw.sh

echo "=== 1. Image version ==="
openclaw --version 2>/dev/null || echo "(no --version flag)"

echo ""
echo "=== 2. Gateway health (200 or 401 = OK) ==="
code=$(curl -sf -o /dev/null -w '%{http_code}' http://127.0.0.1:18789 2>/dev/null || echo "000")
echo "HTTP $code"
if [ "$code" = "200" ] || [ "$code" = "401" ]; then echo "PASS"; else echo "FAIL"; fi

echo ""
echo "=== 3. Config: primary model ==="
openclaw config get agents.defaults.model.primary 2>/dev/null || echo "config get not available"

echo ""
echo "=== 4. Config: commands.restart (should be false) ==="
openclaw config get commands.restart 2>/dev/null || echo "config get not available"

echo ""
echo "=== 5. Config: commands.native (should be false) ==="
openclaw config get commands.native 2>/dev/null || echo "config get not available"

echo ""
echo "=== 6. Skills present on PVC ==="
ls /home/user/.openclaw/skills/ 2>/dev/null || echo "skills dir missing"

echo ""
echo "=== 7. Ollama Cloud (openai-compat) models endpoint ==="
ocode=$(curl -sf -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://ollama.com/v1/models 2>/dev/null || echo "000")
echo "HTTP $ocode"
if [ "$ocode" = "200" ]; then echo "PASS"; else echo "WARN (non-200)"; fi

echo ""
echo "=== 8. Groq API connectivity ==="
if [ -n "$GROQ_API_KEY" ]; then
  gcode=$(curl -sf -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $GROQ_API_KEY" \
    https://api.groq.com/openai/v1/models 2>/dev/null || echo "000")
  echo "HTTP $gcode"
  if [ "$gcode" = "200" ]; then echo "PASS"; else echo "WARN"; fi
else
  echo "SKIP (no GROQ_API_KEY)"
fi

echo ""
echo "=== 9. OpenRouter API connectivity ==="
if [ -n "$OPENROUTER_API_KEY" ]; then
  orcode=$(curl -sf -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $OPENROUTER_API_KEY" \
    https://openrouter.ai/api/v1/models 2>/dev/null || echo "000")
  echo "HTTP $orcode"
  if [ "$orcode" = "200" ]; then echo "PASS"; else echo "WARN"; fi
else
  echo "SKIP (no OPENROUTER_API_KEY)"
fi

echo ""
echo "=== 10. Mistral API connectivity ==="
if [ -n "$MISTRAL_API_KEY" ]; then
  mcode=$(curl -sf -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $MISTRAL_API_KEY" \
    https://api.mistral.ai/v1/models 2>/dev/null || echo "000")
  echo "HTTP $mcode"
  if [ "$mcode" = "200" ]; then echo "PASS"; else echo "WARN"; fi
else
  echo "SKIP (no MISTRAL_API_KEY)"
fi

echo ""
echo "=== 11. HuggingFace token check ==="
if [ -n "$HF_TOKEN" ]; then
  hfcode=$(curl -sf -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $HF_TOKEN" \
    https://huggingface.co/api/whoami 2>/dev/null || echo "000")
  echo "HTTP $hfcode"
  if [ "$hfcode" = "200" ]; then echo "PASS"; else echo "WARN"; fi
else
  echo "SKIP (no HF_TOKEN)"
fi

echo ""
echo "=== All tests complete ==="

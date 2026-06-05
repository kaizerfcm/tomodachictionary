# LM Studio setup for Tomodict

Tomodict talks to LM Studio's **native REST API** at `http://{IP}:1234/api/v1/chat` (not the OpenAI `/v1/chat/completions` endpoint).

## 1. Load the model

1. Open LM Studio.
2. Load **`gemma-4-12b-it-heretic`** (or your preferred Gemma build).
3. Note the exact model identifier shown in LM Studio — it must match `LLM_MODEL_ID` in `src/lib/ai/localLlmConfig.ts` (currently `gemma-4-12b-it-heretic`).

## 2. Import the preset

1. In LM Studio, open the **Presets** dropdown in the sidebar.
2. Click **Import** → **Import from file**.
3. Select [`tomodict-canon-json.preset.json`](./tomodict-canon-json.preset.json) from this folder.
4. Select the imported **Tomodict — Canon JSON** preset before testing in the LM Studio chat UI.

The preset sets temperature, repeat penalty, context length, and a system prompt aligned with the app. Tomodict still sends its own `system_prompt` on every API request, so generation works even if the preset is not selected — the preset is mainly for manual testing inside LM Studio.

### Recommended preset values

| Setting | Value | Why |
| --- | --- | --- |
| Temperature | 0.7 | Canon-accurate but not totally flat |
| Repeat penalty | 1.15 | Reduces looping on long JSON |
| Context length | 8192 | Room for large phrase/nickname batches |
| Top P | 0.9 | Default nucleus sampling |

## 3. Start the local server

1. Open the **Local Server** tab in LM Studio.
2. Start the server on port **1234** (default).
3. Confirm the server is running.

Quick test (should return rhyming JSON-free text):

```bash
curl http://localhost:1234/api/v1/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"gemma-4-12b-it-heretic\",
    \"system_prompt\": \"Reply with JSON only: {\\\"ok\\\": true}\",
    \"input\": \"Return the JSON now.\"
  }"
```

## 4. Configure Tomodict

1. Open Tomodict → **Configuration**.
2. Set **IP** to `127.0.0.1` (same machine) or your PC's LAN IP if Tomodict runs on another device.
3. Use any ✨ Canon AI button.

## Troubleshooting

| Error | Fix |
| --- | --- |
| `'messages' field is required` | Wrong endpoint — update Tomodict to the latest build (uses `/api/v1/chat`, not OpenAI format). |
| `Could not reach local LLM` | Server not started, wrong IP, or firewall blocking port 1234. |
| `Empty response from local LLM` | Model not loaded, or model id in `localLlmConfig.ts` does not match LM Studio. |
| Truncated / invalid JSON | Normal for large jobs — Tomodict auto-continues up to 16 rounds. Increase context length in LM Studio if it keeps failing. |

## Changing the model

Edit `LLM_MODEL_ID` in `src/lib/ai/localLlmConfig.ts` to match whatever model identifier LM Studio shows when that model is loaded.

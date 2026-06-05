# LM Studio setup for Tomodict

Tomodict uses LM Studio's **native REST API** (`POST /api/v1/chat` with `system_prompt` + `input`).

## How requests reach LM Studio

| Where you open Tomodict | What happens |
| --- | --- |
| `npm run dev` / `npm run preview` | Vite proxies `/llm-api/v1/chat` → LM Studio (no extra setup) |
| **Deployed site** (Vercel, etc.) | Browser calls a **local CORS proxy** on your PC → LM Studio |

Browsers block deployed HTTPS sites from calling LM Studio directly (CORS + private network rules). The local proxy fixes that.

---

## 1. Load the model

1. Open LM Studio.
2. Load **`gemma-4-12b-it-heretic`**.
3. Match `LLM_MODEL_ID` in `src/lib/ai/localLlmConfig.ts` (currently `gemma-4-12b-it-heretic`).

## 2. Import the preset (optional)

1. Presets dropdown → **Import** → **Import from file**
2. Select [`tomodict-canon-json.preset.json`](./tomodict-canon-json.preset.json)
3. Use **Tomodict — Canon JSON** when testing in LM Studio chat

Tomodict sends its own `system_prompt` on every API call, so the preset is mainly for manual LM Studio testing.

## 3. Start LM Studio server

1. Local Server tab → start on port **1234**
2. Confirm the model is loaded

Direct test:

```bash
curl http://localhost:1234/api/v1/chat \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"gemma-4-12b-it-heretic\",\"system_prompt\":\"Reply with JSON only: {\\\"ok\\\": true}\",\"input\":\"Return the JSON now.\"}"
```

---

## 4a. Local development (`npm run dev`)

1. Tomodict → Configuration → IP = `127.0.0.1`
2. Use Canon AI — Vite handles the proxy automatically

---

## 4b. Deployed site + local LLM (your setup)

**Requirements:** Tomodict open in browser on the **same PC** that runs LM Studio.

1. Start LM Studio (port 1234, model loaded)
2. In the Tomodict repo, run:

```bash
npm run llm-proxy
```

This starts a CORS proxy on `http://127.0.0.1:1235/api/v1/chat` that forwards to LM Studio.

3. Open your **deployed** Tomodict URL in the browser (same machine)
4. Configuration → IP = `127.0.0.1`
5. Use Canon AI

Keep `npm run llm-proxy` running in a terminal while testing.

### Another device on your network?

LM Studio must be reachable from that device. Run the proxy listening on all interfaces:

```bash
set LLM_PROXY_LISTEN=0.0.0.0
npm run llm-proxy
```

Set IP in Tomodict to your PC's LAN address (e.g. `192.168.1.50`). Your firewall must allow inbound port **1235**.

---

## 4c. Remote access (phone / different network)

A deployed site **cannot** reach your home PC without a tunnel. Options:

- **Cloudflare Tunnel** or **ngrok** exposing port 1234 or the CORS proxy
- You would need a full HTTPS URL in settings (not supported yet — IP-only field targets same-machine / LAN use)

For most testing, use the deployed site on the same PC as LM Studio with `npm run llm-proxy`.

---

## Troubleshooting

| Error | Fix |
| --- | --- |
| `OPTIONS /api/v1/chat` in LM Studio logs | Browser hit LM Studio directly — use `npm run llm-proxy` on deployed, or `npm run dev` locally |
| `Could not reach local LLM` | LM Studio not running, proxy not running (`npm run llm-proxy`), or wrong IP |
| `LM Studio unreachable at …:1234` | Start LM Studio server; check model is loaded |
| `Empty response from local LLM` | Model id mismatch — update `LLM_MODEL_ID` in `localLlmConfig.ts` |
| Truncated / invalid JSON | Tomodict auto-continues up to 16 rounds; increase context length in LM Studio |

## Changing the model

Edit `LLM_MODEL_ID` in `src/lib/ai/localLlmConfig.ts`.

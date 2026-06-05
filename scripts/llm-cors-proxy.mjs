#!/usr/bin/env node
/**
 * Local CORS proxy for Tomodict production → LM Studio.
 *
 * Lets a deployed HTTPS site call your machine's LM Studio by handling
 * browser OPTIONS preflight and adding Access-Control-* headers.
 *
 * Usage: npm run llm-proxy
 * Then open your deployed Tomodict, set IP to 127.0.0.1, and use Canon AI.
 */
import http from 'node:http';

const PROXY_PORT = Number(process.env.LLM_CORS_PROXY_PORT || 1235);
const LM_STUDIO_PORT = Number(process.env.LLM_STUDIO_PORT || 1234);
const DEFAULT_HOST = process.env.LLM_HOST || '127.0.0.1';
const LISTEN_HOST = process.env.LLM_PROXY_LISTEN || '127.0.0.1';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-LLM-Host',
    'Access-Control-Allow-Private-Network': 'true',
    Vary: 'Origin',
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/v1/chat') {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain' });
    res.end('Tomodict LLM CORS proxy — POST /api/v1/chat only');
    return;
  }

  const targetHost = String(req.headers['x-llm-host'] || DEFAULT_HOST).trim();
  const body = await readBody(req);

  const proxyReq = http.request(
    {
      hostname: targetHost,
      port: LM_STUDIO_PORT,
      path: '/api/v1/chat',
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Content-Length': body.length,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, {
        ...headers,
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      });
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { ...headers, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `LM Studio unreachable at ${targetHost}:${LM_STUDIO_PORT}: ${err.message}` }));
  });

  proxyReq.write(body);
  proxyReq.end();
});

server.listen(PROXY_PORT, LISTEN_HOST, () => {
  console.log(
    `Tomodict LLM CORS proxy listening on http://${LISTEN_HOST}:${PROXY_PORT}/api/v1/chat`,
  );
  console.log(`Forwarding to http://${DEFAULT_HOST}:${LM_STUDIO_PORT}/api/v1/chat`);
  console.log('Keep this running while using Canon AI on your deployed site.');
});

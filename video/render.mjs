// Renders video/ccd-tutorial.html to an MP4 (vertical 1080x1920, 30 fps, silent).
//   1. Chrome (headless) draws one PNG per frame by calling window.seek(t).
//   2. Blender (headless, uses its bundled FFmpeg) encodes the frames to H.264.
// Usage:  node video/render.mjs [--fps=30] [--only=<seconds>] [--out=video/out]
// Requires Google Chrome and Blender installed (paths below, override with CHROME_PATH / BLENDER_PATH).
// No npm dependencies: it talks to Chrome over the DevTools protocol with Node's built-in WebSocket.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const fps = Number(args.fps ?? 30);
const outDir = resolve(args.out ?? join(here, 'out'));
const framesDir = join(outDir, 'frames');
const mp4 = join(outDir, 'tutorial-inscripcion.mp4');

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BLENDER = process.env.BLENDER_PATH ?? 'C:/Program Files/Blender Foundation/Blender 4.2/blender.exe';
for (const [name, path] of [['Chrome', CHROME], ['Blender', BLENDER]]) if (!existsSync(path)) throw new Error(`${name} not found at ${path}`);

mkdirSync(framesDir, { recursive: true });
for (const file of readdirSync(framesDir)) if (file.startsWith('frame_')) rmSync(join(framesDir, file));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ccd-video-'))}`, '--window-size=1080,1920', 'about:blank'], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = pages.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* Chrome is still starting */ }
    await sleep(250);
  }
  throw new Error('Chrome did not start');
}

const ws = new WebSocket(await wsUrl());
await new Promise((resolveOpen) => (ws.onopen = resolveOpen));
let nextId = 0;
const waiting = new Map();
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && waiting.has(message.id)) { waiting.get(message.id)(message); waiting.delete(message.id); }
};
const send = (method, params = {}) => new Promise((done) => { const id = ++nextId; waiting.set(id, done); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

try {
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${pathToFileURL(join(here, 'ccd-tutorial.html')).href}?render=1` });
  await sleep(1500);
  await evaluate('window.__ready');
  const duration = Number(args.only ?? (await evaluate('window.DURATION')));
  const total = Math.round(duration * fps);
  console.log(`Rendering ${total} frames (${duration}s @ ${fps}fps)…`);
  const started = Date.now();
  for (let frame = 0; frame < total; frame++) {
    await evaluate(`window.seek(${(frame / fps).toFixed(4)})`);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true });
    writeFileSync(join(framesDir, `frame_${String(frame + 1).padStart(5, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
    if (frame % 90 === 0) console.log(`  frame ${frame}/${total} (${Math.round((Date.now() - started) / 1000)}s)`);
  }
} finally {
  ws.close();
  chrome.kill();
}

const encoder = join(here, 'encode.py');
console.log('Encoding with Blender…');
const result = spawnSync(BLENDER, ['-b', '--factory-startup', '-P', encoder, '--', framesDir, mp4, String(fps)], { stdio: 'inherit' });
if (result.status !== 0 || !existsSync(mp4)) throw new Error('Blender failed to produce the video');
console.log(`Done: ${mp4}`);

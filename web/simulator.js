import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import { z } from 'zod';
import { isShowCommand, validateAppCall, sandboxAddress, UI_URI, UI_MIME } from './host-contract.js';

// Configure before SDK module initialization, which creates Zod schemas and probes eval.
z.config({ jitless: true });
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { AppBridge, PostMessageTransport, getToolUiResourceUri } = await import('@modelcontextprotocol/ext-apps/app-bridge');
const $ = id => document.getElementById(id);
const client = new Client({ name: 'Thought Map local simulator', version: '0.1.0' }, {
  jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
  capabilities: { extensions: { 'io.modelcontextprotocol/ui': { mimeTypes: [UI_MIME] } } }
});
let config, tools, bridge, cleanup = () => {}, currentTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
function applyTheme() {
  document.documentElement.dataset.theme = currentTheme;
  $('theme').textContent = currentTheme === 'dark' ? 'Light theme' : 'Dark theme';
  $('theme').setAttribute('aria-label', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} theme`);
  bridge?.setHostContext({ theme: currentTheme });
}
applyTheme();
$('theme').addEventListener('click', () => { currentTheme = currentTheme === 'dark' ? 'light' : 'dark'; applyTheme(); });
function busy(value) { $('save').disabled = value || config?.demo === true; $('show-map').disabled = value; }
function timeout(promise, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(message)), 12000); })]).finally(() => clearTimeout(timer));
}
async function unmount() {
  cleanup(); cleanup = () => {};
  if (bridge) { await bridge.close(); bridge = null; }
  $('app-frame').hidden = true; $('app-frame').removeAttribute('src'); $('waiting').hidden = false;
}
async function showMap() {
  await unmount();
  const tool = tools.find(tool => tool.name === 'show_map');
  if (!tool || getToolUiResourceUri(tool) !== UI_URI) throw Error('UI resource unavailable.');
  const resource = await client.readResource({ uri: UI_URI });
  const content = resource.contents?.[0];
  if (resource.contents.length !== 1 || content.uri !== UI_URI || content.mimeType !== UI_MIME || typeof content.text !== 'string') throw Error('Invalid UI resource.');
  const iframe = $('app-frame'), url = sandboxAddress(config.sandboxOrigin, location.origin);
  const listing = (await client.listResources()).resources.find(item => item.uri === UI_URI);
  const ui = content._meta?.ui ?? listing?._meta?.ui ?? {};
  if (Object.values(ui.csp ?? {}).some(domains => !Array.isArray(domains) || domains.length > 0) || Object.keys(ui.permissions ?? {}).length) throw Error('This simulator supports offline App resources only.');
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.setAttribute('referrerpolicy', 'origin');
  const guard = event => { if (event.source === iframe.contentWindow && event.origin !== url.origin) event.stopImmediatePropagation(); };
  window.addEventListener('message', guard, true);
  bridge = new AppBridge(null, { name: 'Thought Map host', version: '0.1.0' }, { serverTools: {} }, {
    hostContext: { theme: currentTheme, platform: 'web', displayMode: 'inline', availableDisplayModes: ['inline'], containerDimensions: { width: 768, height: 480 } }
  });
  bridge.oncalltool = async params => { validateAppCall(params, tools); return client.callTool({ name: params.name, arguments: params.arguments ?? {} }); };
  let readyHandler;
  const proxyReady = new Promise(resolve => {
    readyHandler = event => {
      if (event.source === iframe.contentWindow && event.origin === url.origin && event.data?.jsonrpc === '2.0' && event.data.method === 'ui/notifications/sandbox-proxy-ready') resolve();
    };
    window.addEventListener('message', readyHandler);
  });
  cleanup = () => { window.removeEventListener('message', guard, true); window.removeEventListener('message', readyHandler); };
  const initialized = new Promise(resolve => { bridge.oninitialized = resolve; });
  const transport = new PostMessageTransport(iframe.contentWindow, iframe.contentWindow);
  transport.send = async message => { iframe.contentWindow.postMessage(message, url.origin); };
  await bridge.connect(transport);
  iframe.src = url.href;
  await timeout(proxyReady, 'Sandbox did not start.');
  window.removeEventListener('message', readyHandler);
  await bridge.sendSandboxResourceReady({ html: content.text, csp: ui.csp ?? {} });
  await timeout(initialized, 'App did not initialize.');
  await bridge.sendToolInput({ arguments: {} });
  const result = await client.callTool({ name: 'show_map', arguments: {} });
  await bridge.sendToolResult(result);
  iframe.hidden = false; $('waiting').hidden = true;
  $('feedback').textContent = config.demo ? 'Synthetic fixed demo · replay uses saved results, not live inference.' : 'Your map is open. Every original thought is still available.';
}
async function action(callback) {
  busy(true);
  try { await callback(); }
  catch { await unmount().catch(() => {}); $('feedback').textContent = 'The map connection could not finish. Your words were not cleared. Check the local server and sandbox, then try again.'; }
  finally { busy(false); }
}
$('capture-form').addEventListener('submit', event => {
  event.preventDefault();
  void action(async () => {
    const text = $('thought').value;
    if (!text.trim()) { $('feedback').textContent = 'Add a thought first.'; return; }
    if (isShowCommand(text)) { await showMap(); return; }
    if (config.demo) throw Error('Demo capture is disabled.');
    const result = await client.callTool({ name: 'capture_thought', arguments: { text } });
    if (result.isError || result.structuredContent?.received !== true || !Number.isSafeInteger(result.structuredContent.pending_count)) throw Error('Capture failed.');
    await unmount();
    $('quiet-count').textContent = `${result.structuredContent.pending_count} thoughts received`;
    $('feedback').textContent = 'Received.';
    if ($('thought').value === text) $('thought').value = '';
    $('thought').focus();
  });
});
$('show-map').addEventListener('click', () => void action(showMap));
try {
  const response = await fetch('/ui-config', { credentials: 'omit' });
  if (!response.ok) throw Error('UI configuration unavailable.');
  config = await response.json(); sandboxAddress(config.sandboxOrigin, location.origin);
  if (typeof config.demo !== 'boolean') throw Error('Invalid mode.');
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', location.origin)));
  tools = (await client.listTools()).tools;
  if (config.demo) {
    $('capture-form').hidden = true; $('mode-label').textContent = 'SYNTHETIC · FIXED DEMO';
    $('capture-title').textContent = 'A repeatable moment of clarity.';
    $('mode-description').textContent = 'Hand-authored example thoughts and saved results. This is a demonstration of the interface, not evidence of live inference quality.';
    $('show-map').textContent = 'Open fixed demo →';
    document.querySelector('.small-note').textContent = 'Replay inside the map never requests new inference.';
  }
  $('feedback').textContent = config.demo ? 'Fixed demo ready. No live inference.' : 'Ready when you are.';
  busy(false);
} catch { $('feedback').textContent = 'Local MCP connection unavailable. Start the server and its separate sandbox, then reload.'; }
window.addEventListener('pagehide', () => { cleanup(); void bridge?.close(); void client.close(); });

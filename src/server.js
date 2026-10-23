import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { createServer as createHttpServer } from 'node:http';
import { z } from 'zod';
import { ThoughtStore } from './storage.js';
import { RootAnalysis, mapAnalysisSchema } from './analysis.js';
import { createBedrockProvider } from './bedrock.js';
import { createLayout } from './layout.js';
import { createDemoStore } from './demo.js';
import { uiUri, uiMeta, readUi, securityHeaders } from './ui.js';

const port = Number(process.env.PORT ?? 3000);
const sandboxPort = Number(process.env.SANDBOX_PORT ?? (port === 0 ? 0 : 3001));
if ([port, sandboxPort].some(value => !Number.isInteger(value) || value < 0 || value > 65535)) {
  throw new Error('PORT and SANDBOX_PORT must be integers between 0 and 65535.');
}

const demo = process.argv.includes('--demo');
const demoStore = demo ? createDemoStore() : null;
const store = demoStore?.store ?? new ThoughtStore(process.env.DB_PATH ?? 'data/thought-map.sqlite');
// This server is the sole analysis owner for this database.
store.recoverInterrupted();
const analysis = new RootAnalysis(store, !demo && process.env.BEDROCK_ENABLED === '1' ? createBedrockProvider() : null);
const app = createMcpExpressApp({ host: '127.0.0.1' });
app.disable('x-powered-by');
app.set('strict routing', true);
const inspectorOrigins = new Set(['http://localhost:6274', 'http://127.0.0.1:6274']);
const origins = server => ['127.0.0.1', 'localhost'].map(host => new URL(`http://${host}:${server.address().port}`).origin);
const validHost = (req, server) => origins(server).some(origin => new URL(origin).host === req.headers.host);

app.use((req, res, next) => {
  if (!sandboxServer.listening) { res.status(503).end(); return; }
  const origin = req.get('origin');
  securityHeaders(res, { host: true, peer: origins(sandboxServer)[0] });
  if (!validHost(req, httpServer) || (origin !== undefined && !origins(httpServer).includes(origin) && !(req.url === '/mcp' && inspectorOrigins.has(origin)))) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return;
  }
  if (!['/mcp', '/simulator', '/ui-config'].includes(req.url)) {
    res.status(404).end();
    return;
  }
  next();
});

function result(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data };
}

function createServer() {
  const server = new McpServer({ name: 'alexa-thought-map', version: '0.1.0' });
  server.registerTool('capture_thought', {
    description: 'Save exactly what the user said, verbatim, preserving every word and whitespace. Do not summarize or paraphrase. Use show_map when the user asks to see or organize their thoughts.',
    inputSchema: {
      text: z.string().max(20000).refine(text => text.trim().length > 0, 'A thought must contain text.').describe('The original user utterance, unchanged.')
    },
    outputSchema: { received: z.literal(true), pending_count: z.number().int().nonnegative() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, async ({ text }) => result(store.capture(text)));

  registerAppTool(server, 'show_map', {
    description: 'Return the current map state when the user asks to see or organize their thoughts. Starts background attributes, roots and priority when enabled; analyzing means wait and poll. Pending means disabled, queued behind an older snapshot, or failed. Ready includes inferred topics, roots and focus when those stages are available; a null focus means no supported actionable root.',
    inputSchema: { retry: z.boolean().default(false).describe('Explicitly retry a failed or interrupted analysis once; may incur another model charge. Ordinary polling must leave false.') },
    outputSchema: {
      status: z.enum(['empty', 'pending', 'analyzing', 'ready']),
      pending_count: z.number().int().nonnegative(),
      root_sentence: z.string().nullable(),
      next_action: z.string().nullable(),
      error: z.string().optional(),
      analysis: mapAnalysisSchema.optional()
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    _meta: { ui: { resourceUri: uiUri, visibility: ['model', 'app'] } }
  }, async (args) => {
    const data = analysis.showMap(args);
    return { ...result(data), ...(data.analysis ? { _meta: { layout: createLayout(data.analysis) } } : {}) };
  });
  registerAppTool(server, 'focus_root', {
    description: 'Read the saved root details for the currently displayed map version. Rejects stale maps without starting inference.',
    inputSchema: z.strictObject({ version: z.number().int().positive(), root_id: z.number().int().positive() }),
    outputSchema: {
      version: z.number().int().positive(), root_id: z.number().int().positive(),
      root_sentence: z.string(), reason: z.string(), next_action: z.string().nullable(),
      fragments: mapAnalysisSchema.shape.fragments
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    _meta: { ui: { visibility: ['app'] } }
  }, async ({ version, root_id }) => {
    const saved = store.analysis(version);
    const root = saved?.result?.roots.find(root => root.root_id === root_id);
    if (store.snapshot().version !== version || saved?.status !== 'ready' || !root || typeof root.reason !== 'string') {
      return { isError: true, content: [{ type: 'text', text: 'Map changed or root unavailable. Show the current map again.' }] };
    }
    const fragments = saved.result.fragments ?? saved.snapshot;
    return result({ version, root_id, root_sentence: root.sentence, reason: root.reason, next_action: root.next_action ?? null,
      fragments: fragments.filter(fragment => root.fragment_ids.includes(fragment.id)) });
  });
  registerAppResource(server, 'Thought Map', uiUri, { _meta: uiMeta }, async () => ({
    contents: [{ uri: uiUri, mimeType: RESOURCE_MIME_TYPE, text: await readUi('map'), _meta: uiMeta }]
  }));
  return server;
}

app.post('/mcp', async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => {
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    console.error('MCP request failed.');
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error.' }, id: null });
    }
  }
});

app.all('/mcp', (req, res) => {
  res.set('Allow', 'POST').status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
});

app.get('/simulator', async (req, res) => {
  try { res.type('html').send(await readUi('simulator')); }
  catch { res.status(503).type('text').send('UI build unavailable. Run npm run build.'); }
});
app.get('/ui-config', (req, res) => res.json({ sandboxOrigin: origins(sandboxServer)[0], demo }));
app.use((req, res) => res.status(405).end());
app.use((error, req, res, next) => {
  if (!res.headersSent) res.status(400).json({ error: 'Invalid request.' });
});

const httpServer = createHttpServer(app);
const sandboxServer = createHttpServer(async (req, res) => {
  const hostOrigins = origins(httpServer);
  securityHeaders(res, { peer: hostOrigins.join(' ') });
  const origin = req.headers.origin;
  if (!validHost(req, sandboxServer) || (origin !== undefined && ![...hostOrigins, ...origins(sandboxServer)].includes(origin))) {
    res.writeHead(403).end(); return;
  }
  if (!req.url.startsWith('/sandbox.html?')) { res.writeHead(404).end(); return; }
  const url = new URL(req.url, origins(sandboxServer)[0]);
  if (url.pathname !== '/sandbox.html' ||
      [...url.searchParams].length !== 1 || !hostOrigins.includes(url.searchParams.get('hostOrigin'))) {
    res.writeHead(404).end(); return;
  }
  if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }).end(); return; }
  try {
    const html = await readUi('sandbox');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  } catch { res.writeHead(503).end('UI build unavailable. Run npm run build.'); }
});

let closing;
function shutdown() {
  return closing ??= (async () => {
    await Promise.all([httpServer, sandboxServer].map(server => new Promise(resolve => server.close(resolve))));
    await analysis.running;
    store.close();
    demoStore?.cleanup();
  })();
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

let starting = 'MCP';
try {
  for (const [server, listenPort] of [[httpServer, port], [sandboxServer, sandboxPort]]) {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(listenPort, '127.0.0.1', resolve);
    });
    starting = 'sandbox';
  }
  console.log(`MCP server listening on ${origins(httpServer)[0]}/mcp`);
  console.log(`Simulator: ${origins(httpServer)[0]}/simulator; sandbox: ${origins(sandboxServer)[0]}`);
  if (demo) console.log(`SYNTHETIC FIXED DEMO — no Bedrock provider; isolated database: ${demoStore.path}`);
} catch {
  console.error(starting === 'MCP' ? 'Unable to start MCP server. Check PORT and DB_PATH.' : 'Unable to start sandbox server. Check SANDBOX_PORT.');
  await shutdown();
  process.exitCode = 1;
}

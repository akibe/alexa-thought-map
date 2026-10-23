export const UI_URI = 'ui://thought-map/map.html';
export const UI_MIME = 'text/html;profile=mcp-app';

export function isShowCommand(text) {
  return /^(?:show(?: me)?(?: (?:my|the))? (?:map|thoughts)|organize(?: (?:my|the))? thoughts|見せて|整理して)[.!。！?？]*$/iu.test(text.trim());
}

export function validateAppCall(params, tools) {
  const tool = tools.find(tool => tool.name === params?.name);
  if (!tool || !(tool._meta?.ui?.visibility ?? ['model', 'app']).includes('app')) throw Error('Tool unavailable to this App.');
  const args = params.arguments ?? {};
  if (typeof args !== 'object' || args === null || Array.isArray(args)) throw Error('Invalid arguments.');
  if (params.name === 'show_map' && Object.keys(args).every(key => key === 'retry') && args.retry !== true && (args.retry === undefined || args.retry === false)) return;
  if (params.name === 'focus_root' && Object.keys(args).length === 2 &&
      Number.isSafeInteger(args.version) && args.version > 0 && Number.isSafeInteger(args.root_id) && args.root_id > 0) return;
  throw Error('This App cannot call that operation.');
}

export function sandboxAddress(value, hostOrigin) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.username || url.password || url.origin === hostOrigin || url.pathname !== '/' || url.search || url.hash) throw Error('Invalid sandbox origin.');
  url.pathname = '/sandbox.html';
  url.searchParams.set('hostOrigin', hostOrigin);
  return url;
}

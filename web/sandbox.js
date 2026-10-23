const hostOrigin = new URL(location.href).searchParams.get('hostOrigin');
const expected = new URL(hostOrigin);
if (window.parent === window || expected.origin !== hostOrigin || expected.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(expected.hostname) || expected.origin === location.origin ||
    !document.referrer || new URL(document.referrer).origin !== hostOrigin) throw Error('Invalid embedding origin.');

const inner = document.createElement('iframe');
inner.title = 'Thought Map view';
inner.setAttribute('sandbox', 'allow-scripts allow-same-origin');
document.body.append(inner);
let loaded = false;
window.addEventListener('message', event => {
  const message = event.data;
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') return;
  if (event.source === window.parent && event.origin === hostOrigin) {
    if (message.method === 'ui/notifications/sandbox-resource-ready') {
      if (loaded || typeof message.params?.html !== 'string') return;
      loaded = true;
      // Trusted resource HTML runs under the sandbox response's inherited HTTP CSP.
      const document = inner.contentDocument;
      document.open(); document.write(message.params.html); document.close();
    } else if (loaded && !message.method?.startsWith('ui/notifications/sandbox-')) {
      inner.contentWindow.postMessage(message, location.origin);
    }
  } else if (event.source === inner.contentWindow && event.origin === location.origin && loaded && !message.method?.startsWith('ui/notifications/sandbox-')) {
    window.parent.postMessage(message, hostOrigin);
  }
});
window.parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/sandbox-proxy-ready', params: {} }, hostOrigin);

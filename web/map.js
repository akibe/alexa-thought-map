import { App } from '@modelcontextprotocol/ext-apps';

const app = new App({ name: 'Thought Map', version: '0.1.0' }, {}, { autoResize: false });
const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stageNames = ['Everything on your mind.', 'A little less scattered.', 'Different thoughts. Shared roots.', 'One place to begin.'];
const subtitles = ['Nothing edited. Nothing lost.', 'First, gather the thoughts by topic.', 'Watch the same thoughts find their common ground.', 'A small next step, with the rest still in view.'];
let analysis, layout, stage = 0, generation = 0, detailGeneration = 0, detailOpener, pollTimer, playTimer, pollCount = 0;
const bubbles = new Map();
const color = index => `var(--group${((index % 7) + 7) % 7})`;
function fitViewport() { document.querySelector('.app').style.transform = `scale(${Math.max(1, Math.min(innerWidth / 768, innerHeight / 480))})`; }
window.addEventListener('resize', fitViewport);
fitViewport();
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function theme(context) { if (context?.theme) document.documentElement.dataset.theme = context.theme === 'dark' ? 'dark' : 'light'; }
function stop() { clearTimeout(pollTimer); clearTimeout(playTimer); generation++; }
function status(title, message, busy = false) {
  stop(); analysis = null; layout = null;
  $('details').close();
  $('visual').hidden = true; $('quiet').hidden = false; $('quiet').classList.toggle('analyzing', busy);
  $('title').textContent = title; $('subtitle').textContent = 'Your words stay exactly as you left them.';
  $('quiet-text').textContent = message; $('eyebrow').textContent = busy ? 'MAKING ROOM' : 'A LITTLE ROOM TO THINK';
  for (const button of document.querySelectorAll('footer button')) button.disabled = true;
}
function validate(data, positions) {
  if (!data || !Number.isSafeInteger(data.version) || typeof data.source !== 'string' || !Array.isArray(data.fragments) || !Array.isArray(data.roots) ||
      !positions || positions.version !== data.version || positions.width !== 480 || positions.height !== 252 || !Array.isArray(positions.nodes) || positions.nodes.length > 16 || !Array.isArray(positions.overflow_ids)) throw Error('Invalid map.');
  const ids = data.fragments.map(fragment => fragment.id);
  if (new Set(ids).size !== ids.length || data.fragments.some(fragment => !Number.isSafeInteger(fragment.id) || typeof fragment.text !== 'string') ||
      data.roots.some(root => typeof root.sentence !== 'string' || !Array.isArray(root.fragment_ids)) ||
      (data.topics && (!Array.isArray(data.topics) || data.topics.some(topic => typeof topic.topic !== 'string' || !Array.isArray(topic.fragment_ids)))) ||
      (data.focus && (typeof data.focus.sentence !== 'string' || typeof data.focus.reason !== 'string' || (data.focus.next_action !== null && typeof data.focus.next_action !== 'string')))) throw Error('Invalid map.');
  const positioned = [...positions.nodes.map(node => node.id), ...positions.overflow_ids];
  if (positioned.length !== ids.length || new Set(positioned).size !== ids.length || positioned.some(id => !ids.includes(id))) throw Error('Invalid layout.');
  for (const node of positions.nodes) {
    if (!Number.isInteger(node.topic) || !Number.isInteger(node.root) || !Array.isArray(node.positions) || node.positions.length !== 4) throw Error('Invalid layout.');
    for (const box of node.positions) if (![box.x, box.y, box.width, box.height].every(Number.isFinite) || box.width !== 108 || box.height !== 48 || box.x < 0 || box.y < 0 || box.x + box.width > 480 || box.y + box.height > 252) throw Error('Invalid layout.');
  }
}
function details(title, fragments, reason = '', action = '') {
  detailGeneration++;
  $('detail-title').textContent = title; $('detail-reason').textContent = reason;
  $('detail-action').textContent = action || '';
  $('detail-list').replaceChildren(...fragments.map(fragment => element('li', fragment.text)));
  if (!$('details').open) $('details').showModal();
}
async function rootDetails(root, opener) {
  detailOpener = opener;
  if (!Number.isSafeInteger(root.root_id)) {
    details(root.sentence, analysis.fragments.filter(fragment => root.fragment_ids.includes(fragment.id)), 'This older result has no saved focus judgment.');
    return;
  }
  const version = analysis.version, current = generation;
  details(root.sentence, [], 'Opening original thoughts…');
  const selection = detailGeneration;
  try {
    const result = await app.callServerTool({ name: 'focus_root', arguments: { version, root_id: root.root_id } });
    if (generation !== current || detailGeneration !== selection || !$('details').open) return;
    const data = result.structuredContent;
    if (result.isError || data?.version !== version || data?.root_id !== root.root_id || typeof data.root_sentence !== 'string' ||
        typeof data.reason !== 'string' || !Array.isArray(data.fragments) || data.fragments.some(fragment => typeof fragment.text !== 'string') ||
        (data.next_action !== null && typeof data.next_action !== 'string')) throw Error('Invalid detail.');
    if ($('details').open) details(data.root_sentence, data.fragments, data.reason, data.next_action);
  } catch { if (generation === current && detailGeneration === selection && $('details').open) $('detail-reason').textContent = 'This map may have changed. Close this panel and show the map again.'; }
}
function rootButton(root, index) {
  const button = element('button', undefined, 'root-choice'); button.type = 'button';
  button.style.borderColor = color(index);
  button.append(element('strong', root.sentence), element('small', `${root.fragment_ids.length} connected thoughts · open`));
  button.addEventListener('click', () => void rootDetails(root, button));
  return button;
}
function renderStage(nextStage) {
  clearTimeout(playTimer);
  if (!analysis) return;
  stage = nextStage;
  $('title').textContent = stageNames[stage]; $('subtitle').textContent = subtitles[stage];
  $('eyebrow').textContent = ['00 / THOUGHTS', '01 / GATHER', '02 / CONNECT', '03 / BEGIN'][stage];
  for (const button of document.querySelectorAll('[data-stage]')) {
    const value = Number(button.dataset.stage);
    button.disabled = value === 1 && !analysis.topics;
    if (value === stage) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
  }
  for (const node of layout.nodes) {
    const bubble = bubbles.get(node.id), box = node.positions[stage];
    bubble.style.transform = `translate(${box.x}px,${box.y}px)`;
    bubble.style.borderLeftColor = stage === 0 ? 'var(--line)' : (stage === 1 ? color(node.topic) : node.root < 0 ? 'var(--muted)' : color(node.root));
    bubble.classList.toggle('muted', stage === 3 && !!analysis.focus && !node.focused);
  }
  const panel = $('insight'); panel.replaceChildren();
  if (stage === 0) {
    panel.append(element('p', 'A place for all of it.', 'eyebrow'), element('div', String(analysis.fragments.length), 'large-number'), element('h2', 'Thoughts, not a to-do list.'), element('p', 'Move through the map at your own pace. Every original word is still here.'));
  } else if (stage === 1) {
    panel.append(element('h2', `${analysis.topics.length} starting points.`));
    analysis.topics.forEach((topic, index) => {
      const row = element('div', undefined, 'topic-line'), dot = element('i'); dot.style.background = color(index);
      row.append(dot, element('span', topic.topic), element('small', String(topic.fragment_ids.length))); panel.append(row);
    });
  } else if (stage === 2) {
    panel.append(element('p', 'TAP A ROOT TO LOOK CLOSER', 'eyebrow'));
    analysis.roots.forEach((root, index) => panel.append(rootButton(root, index)));
    if (!analysis.roots.length) panel.append(element('h2', 'Some thoughts stand on their own.'));
    if (analysis.unmatched_fragment_ids?.length) panel.append(element('p', `${analysis.unmatched_fragment_ids.length} thoughts stay ungrouped. Find them in Read thoughts.`));
  } else if (analysis.focus) {
    const focus = analysis.focus;
    panel.append(element('p', 'ONE SMALL NEXT STEP', 'eyebrow'), element('h2', focus.sentence), element('p', focus.reason));
    if (focus.next_action) panel.append(element('p', focus.next_action, 'action'));
    const root = analysis.roots.find(root => root.root_id === focus.root_id);
    if (root) { const button = element('button', 'See connected thoughts', 'text-button'); button.addEventListener('click', () => void rootDetails(root, button)); panel.append(button); }
  } else {
    panel.append(element('h2', analysis.focus === null ? 'No need to force a next step.' : 'The focus is not ready yet.'), element('p', analysis.focus === null ? 'None of these roots has a saved action you can start now. Your map is still here.' : 'This saved result has roots, but no priority judgment. Nothing has been invented.'));
  }
  $('next').disabled = stage === 3;
  $('announcement').textContent = stageNames[stage];
}
function startReplay() {
  renderStage(0);
  if (reducedMotion.matches) { $('announcement').textContent = 'Replay reset. Reduced motion is on; use Next to move through the stages.'; return; }
  const advance = () => {
    if (stage >= 3 || !analysis) return;
    renderStage(stage === 0 && !analysis.topics ? 2 : stage + 1);
    if (stage < 3) playTimer = setTimeout(advance, 3200);
  };
  playTimer = setTimeout(advance, 2400);
}
function accept(result, fromPoll = false) {
  if (result.isError) { status('Your words are safe.', 'The map could not be opened. Try Show map again when you are ready.'); return; }
  const data = result.structuredContent;
  if (!data || !['empty', 'pending', 'analyzing', 'ready'].includes(data.status)) { status('This map could not be read.', 'The server returned an unsupported response.'); return; }
  $('count').textContent = `${Number.isSafeInteger(data.pending_count) ? data.pending_count : 0} thoughts`;
  if (data.status !== 'ready') {
    status(data.status === 'analyzing' ? 'Finding the connections.' : 'Let it all out.', data.status === 'analyzing' ? 'A little space while your thoughts find their roots.' : data.error ? 'Analysis did not finish. Your original thoughts are saved; no automatic retry will run.' : data.status === 'empty' ? 'Nothing to organize yet. Add a thought in the simulator.' : 'Your thoughts are saved. Analysis is not available yet.', data.status === 'analyzing');
    if (!fromPoll) pollCount = 0;
    if (data.status === 'analyzing' && pollCount < 60) {
      const current = generation;
      pollTimer = setTimeout(async () => {
        try { pollCount++; const response = await app.callServerTool({ name: 'show_map', arguments: {} }); if (current === generation) accept(response, true); }
        catch { if (current === generation) status('Your thoughts are saved.', 'The connection paused. Use Show map to reconnect.'); }
      }, 1500);
    } else if (data.status === 'analyzing') $('quiet-text').textContent = 'Still working. Automatic checks have paused; use Show map to check again.';
    return;
  }
  try { validate(data.analysis, result._meta?.layout); }
  catch { status('The visual map is not ready.', 'A valid server-calculated layout is required. No positions or roots were invented.'); return; }
  stop(); analysis = data.analysis; layout = result._meta.layout;
  $('details').close(); $('visual').hidden = false; $('quiet').hidden = true;
  $('count').textContent = `${analysis.fragments.length} thoughts`;
  $('provenance').textContent = analysis.source?.startsWith('demo:') ? 'SYNTHETIC · FIXED DEMO' : analysis.source?.startsWith('test:') ? 'SYNTHETIC · TEST DATA' : 'SAVED ANALYSIS';
  $('map-note').textContent = layout.overflow_ids.length ? `+${layout.overflow_ids.length} thoughts in the full list · original wording preserved` : 'Original wording preserved · color shows connections';
  $('canvas').replaceChildren(); bubbles.clear();
  for (const node of layout.nodes) {
    const fragment = analysis.fragments.find(fragment => fragment.id === node.id);
    const bubble = element('div', undefined, 'bubble'); bubble.dataset.root = String(node.root);
    bubble.append(element('p', fragment.text)); bubble.title = fragment.text;
    bubbles.set(node.id, bubble); $('canvas').append(bubble);
  }
  for (const button of document.querySelectorAll('footer button')) button.disabled = false;
  renderStage(0);
}
$('close-details').addEventListener('click', () => $('details').close());
$('details').addEventListener('keydown', event => {
  if (!$('details').open || event.key !== 'Tab') return;
  // shortcut: Close is the only dialog control; cycle focusable elements if more controls are added.
  event.preventDefault(); $('close-details').focus();
});
// A queued close from the previous selection must not invalidate a reopened dialog.
$('details').addEventListener('close', () => {
  if ($('details').open) return;
  detailGeneration++; detailOpener?.focus(); detailOpener = null;
});
$('all-thoughts').addEventListener('click', () => {
  if (!analysis) return;
  detailOpener = $('all-thoughts'); details('Every thought, in your words.', analysis.fragments);
});
$('next').addEventListener('click', () => renderStage(stage === 0 && !analysis.topics ? 2 : Math.min(3, stage + 1)));
$('replay').addEventListener('click', startReplay);
for (const button of document.querySelectorAll('[data-stage]')) button.addEventListener('click', () => renderStage(Number(button.dataset.stage)));
reducedMotion.addEventListener('change', () => clearTimeout(playTimer));
app.ontoolresult = accept;
app.ontoolcancelled = () => status('Your thoughts are saved.', 'The map request was cancelled.');
app.onhostcontextchanged = theme;
app.onteardown = async () => { stop(); return {}; };
try { await app.connect(); theme(app.getHostContext()); }
catch { status('Waiting for an MCP Apps host.', 'This resource needs its host bridge. Opening the HTML alone is not an MCP Apps connection.'); }

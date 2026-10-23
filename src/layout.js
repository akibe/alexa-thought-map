export const MAP_SIZE = { width: 480, height: 252 };
const LIMIT = 16;

export function createLayout(analysis) {
  const { version, fragments, roots, unmatched_fragment_ids: unmatched, topics, focus } = analysis;
  if (!Number.isSafeInteger(version) || version < 1 || !Array.isArray(fragments) || !Array.isArray(roots) || roots.length > 5) {
    throw new Error('Invalid map layout input.');
  }
  const ids = fragments.map(fragment => fragment.id);
  if (ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length ||
      fragments.some(fragment => typeof fragment.text !== 'string')) throw new Error('Invalid fragments.');
  const complete = groups => {
    const members = groups.flatMap(group => group.fragment_ids);
    return members.length === ids.length && new Set(members).size === ids.length && members.every(id => ids.includes(id));
  };
  if (!Array.isArray(unmatched) || roots.some(root => !Array.isArray(root.fragment_ids) || !root.fragment_ids.length) ||
      !complete([...roots, { fragment_ids: unmatched }]) ||
      (topics !== undefined && (!Array.isArray(topics) || topics.some(topic => !Array.isArray(topic.fragment_ids)) || !complete(topics)))) {
    throw new Error('Invalid layout membership.');
  }
  const rootIds = roots.map(root => root.root_id ?? Math.min(...root.fragment_ids));
  if (new Set(rootIds).size !== rootIds.length || rootIds.some(id => !Number.isSafeInteger(id) || id < 1) ||
      (focus && !rootIds.includes(focus.root_id))) throw new Error('Invalid layout roots.');
  const ordered = [...ids].sort((a, b) => a - b);
  // shortcut: sixteen visible bubbles; add paged canvases when larger visual snapshots are needed.
  const visible = ordered.slice(0, LIMIT);
  const byGroups = groups => groups.flatMap(group => [...group.fragment_ids].sort((a, b) => a - b)).filter(id => visible.includes(id));
  const rootOrder = byGroups([...roots, { fragment_ids: unmatched }]);
  const focusedIds = focus ? roots[rootIds.indexOf(focus.root_id)].fragment_ids : [];
  const orders = [visible, topics ? byGroups(topics) : visible, rootOrder,
    [...rootOrder.filter(id => focusedIds.includes(id)), ...rootOrder.filter(id => !focusedIds.includes(id))]];
  return {
    version, ...MAP_SIZE, overflow_ids: ordered.slice(LIMIT),
    nodes: visible.map(id => ({
      id, topic: topics?.findIndex(group => group.fragment_ids.includes(id)) ?? -1,
      root: roots.findIndex(group => group.fragment_ids.includes(id)),
      focused: focusedIds.includes(id),
      positions: orders.map((order, stage) => {
        const slot = order.indexOf(id);
        const jitterX = stage === 0 ? (id % 3 - 1) * 3 : 0;
        const jitterY = stage === 0 ? (id % 5 - 2) * 2 : 0;
        return { x: 7 + slot % 4 * 118 + jitterX, y: 8 + Math.floor(slot / 4) * 60 + jitterY, width: 108, height: 48 };
      })
    }))
  };
}

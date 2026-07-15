const { pg, readJsonBody } = require('./_lib/supabase');

function flip(direction) {
  if (direction === 'forward') return 'backward';
  if (direction === 'backward') return 'forward';
  return direction; // null stays null
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { from, to, direction } = await readJsonBody(req);
    if (!from || !to) return res.status(400).json({ error: 'invalid input' });
    if (direction !== null && direction !== 'forward' && direction !== 'backward') {
      return res.status(400).json({ error: 'invalid direction' });
    }

    const exact = await pg(`roads?from_place=eq.${encodeURIComponent(from)}&to_place=eq.${encodeURIComponent(to)}&select=from_place`);
    if (exact.length) {
      await pg(`roads?from_place=eq.${encodeURIComponent(from)}&to_place=eq.${encodeURIComponent(to)}`, {
        method: 'PATCH', body: JSON.stringify({ direction }),
      });
      return res.status(200).json({});
    }
    const reversed = await pg(`roads?from_place=eq.${encodeURIComponent(to)}&to_place=eq.${encodeURIComponent(from)}&select=from_place`);
    if (reversed.length) {
      await pg(`roads?from_place=eq.${encodeURIComponent(to)}&to_place=eq.${encodeURIComponent(from)}`, {
        method: 'PATCH', body: JSON.stringify({ direction: flip(direction) }),
      });
      return res.status(200).json({});
    }
    res.status(400).json({ error: 'edge not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

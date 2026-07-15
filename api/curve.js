const { pg, readJsonBody } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { from, to, curve } = await readJsonBody(req);
    if (!from || !to || typeof curve !== 'number') return res.status(400).json({ error: 'invalid input' });

    // curve is directional relative to the from->to order the caller is using;
    // try the exact stored orientation first, otherwise the row is stored
    // reversed and the perpendicular offset sign flips with it.
    const exact = await pg(`roads?from_place=eq.${encodeURIComponent(from)}&to_place=eq.${encodeURIComponent(to)}&select=from_place`);
    if (exact.length) {
      await pg(`roads?from_place=eq.${encodeURIComponent(from)}&to_place=eq.${encodeURIComponent(to)}`, {
        method: 'PATCH', body: JSON.stringify({ curve_offset: Math.round(curve) }),
      });
      return res.status(200).json({});
    }
    const reversed = await pg(`roads?from_place=eq.${encodeURIComponent(to)}&to_place=eq.${encodeURIComponent(from)}&select=from_place`);
    if (reversed.length) {
      await pg(`roads?from_place=eq.${encodeURIComponent(to)}&to_place=eq.${encodeURIComponent(from)}`, {
        method: 'PATCH', body: JSON.stringify({ curve_offset: -Math.round(curve) }),
      });
      return res.status(200).json({});
    }
    res.status(400).json({ error: 'edge not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

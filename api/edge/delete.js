const { pg, readJsonBody } = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { from, to } = await readJsonBody(req);
    if (!from || !to) return res.status(400).json({ error: 'invalid input' });

    const existing = await pg(
      `roads?or=(and(from_place.eq.${encodeURIComponent(from)},to_place.eq.${encodeURIComponent(to)}),and(from_place.eq.${encodeURIComponent(to)},to_place.eq.${encodeURIComponent(from)}))&select=from_place,to_place`
    );
    if (!existing.length) return res.status(400).json({ error: 'edge not found' });

    await pg(
      `roads?or=(and(from_place.eq.${encodeURIComponent(from)},to_place.eq.${encodeURIComponent(to)}),and(from_place.eq.${encodeURIComponent(to)},to_place.eq.${encodeURIComponent(from)}))`,
      { method: 'DELETE' }
    );
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

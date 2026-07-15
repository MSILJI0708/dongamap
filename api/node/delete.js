const { pg, readJsonBody } = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { id } = await readJsonBody(req);
    if (!id) return res.status(400).json({ error: 'invalid input' });

    const existing = await pg(`places?place_id=eq.${encodeURIComponent(id)}&select=place_id`);
    if (!existing.length) return res.status(400).json({ error: 'not found' });

    const connected = await pg(
      `roads?or=(from_place.eq.${encodeURIComponent(id)},to_place.eq.${encodeURIComponent(id)})&select=from_place,to_place`
    );

    if (connected.length) {
      await pg(`roads?or=(from_place.eq.${encodeURIComponent(id)},to_place.eq.${encodeURIComponent(id)})`, { method: 'DELETE' });
    }
    await pg(`places?place_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });

    res.status(200).json({ edges: connected.map(r => ({ from: r.from_place, to: r.to_place })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

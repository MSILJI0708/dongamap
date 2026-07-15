const { pg, readJsonBody } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { from, to, category, road_type, dist, time } = await readJsonBody(req);
    if (!from || !to || !category || typeof dist !== 'number' || typeof time !== 'number') {
      return res.status(400).json({ error: 'invalid input' });
    }
    if (from === to) return res.status(400).json({ error: 'from and to are the same place' });

    const [placeA, placeB] = await Promise.all([
      pg(`places?place_id=eq.${encodeURIComponent(from)}&select=place_id`),
      pg(`places?place_id=eq.${encodeURIComponent(to)}&select=place_id`),
    ]);
    if (!placeA.length || !placeB.length) return res.status(400).json({ error: 'place not found' });

    // an edge already exists between these two places, in either stored order
    const existing = await pg(
      `roads?or=(and(from_place.eq.${encodeURIComponent(from)},to_place.eq.${encodeURIComponent(to)}),and(from_place.eq.${encodeURIComponent(to)},to_place.eq.${encodeURIComponent(from)}))&select=from_place,to_place,network_category,curve_offset`
    );

    let replaced = [];
    let curve = null;
    if (existing.length) {
      const same = existing.find(e => e.network_category === category);
      if (same) return res.status(400).json({ error: 'edge already exists with this category' });
      // different category on the same pair -> replace it, carrying its curve over
      await pg(
        `roads?or=(and(from_place.eq.${encodeURIComponent(from)},to_place.eq.${encodeURIComponent(to)}),and(from_place.eq.${encodeURIComponent(to)},to_place.eq.${encodeURIComponent(from)}))`,
        { method: 'DELETE' }
      );
      replaced = existing.map(e => ({ from: e.from_place, to: e.to_place, category: e.network_category }));
      curve = existing[0].curve_offset || null;
    }

    await pg('roads', {
      method: 'POST',
      body: JSON.stringify([{
        from_place: from, to_place: to, road_type: road_type || category,
        distance: Math.round(dist), time: Math.round(time),
        network_category: category, curve_offset: curve, direction: null,
      }]),
    });

    const body = { replaced };
    if (curve) body.curve = curve;
    res.status(200).json(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

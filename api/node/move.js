const { pg, inCampusBounds, haversineM, readJsonBody } = require('../_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { id, lat, lon, deleteEdges } = await readJsonBody(req);
    if (!id || typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'invalid input' });
    }
    if (!inCampusBounds(lat, lon)) {
      return res.status(400).json({ error: 'coordinates outside campus bounds' });
    }

    const rows = await pg(`places?place_id=eq.${encodeURIComponent(id)}&select=place_id`);
    if (!rows.length) return res.status(400).json({ error: 'not found' });
    if (rows.length > 1) return res.status(400).json({ error: 'ambiguous: multiple rows share this place_id, not moved' });

    const connected = await pg(
      `roads?or=(from_place.eq.${encodeURIComponent(id)},to_place.eq.${encodeURIComponent(id)})&select=from_place,to_place,direction`
    );

    if (deleteEdges) {
      if (connected.length) {
        await pg(`roads?or=(from_place.eq.${encodeURIComponent(id)},to_place.eq.${encodeURIComponent(id)})`, { method: 'DELETE' });
      }
      await pg(`places?place_id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      return res.status(200).json({
        removedEdges: connected.map(r => ({ from: r.from_place, to: r.to_place })),
        updatedEdges: [],
      });
    }

    // keep edges: recompute distance/time against the new position and patch each row
    const otherIds = Array.from(new Set(connected.map(r => (r.from_place === id ? r.to_place : r.from_place))));
    const others = otherIds.length
      ? await pg(`places?place_id=in.(${otherIds.map(encodeURIComponent).join(',')})&select=place_id,latitude,longitude`)
      : [];
    const otherById = {};
    others.forEach(o => { otherById[o.place_id] = o; });

    const updatedEdges = [];
    for (const r of connected) {
      const otherId = r.from_place === id ? r.to_place : r.from_place;
      const other = otherById[otherId];
      if (!other || other.latitude === null || other.longitude === null) continue;
      const dist = Math.round(haversineM(lat, lon, other.latitude, other.longitude));
      const time = Math.max(1, Math.round(dist / 1.18));
      await pg(
        `roads?from_place=eq.${encodeURIComponent(r.from_place)}&to_place=eq.${encodeURIComponent(r.to_place)}`,
        { method: 'PATCH', body: JSON.stringify({ distance: dist, time }) }
      );
      updatedEdges.push({ from: r.from_place, to: r.to_place, dist, time, direction: r.direction || undefined });
    }

    await pg(`places?place_id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ latitude: lat, longitude: lon }),
    });

    res.status(200).json({ removedEdges: [], updatedEdges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

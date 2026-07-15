const { pg, inCampusBounds, readJsonBody } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { id, name, lat, lon } = await readJsonBody(req);
    if (!id || typeof lat !== 'number' || typeof lon !== 'number') {
      return res.status(400).json({ error: 'invalid input' });
    }
    if (!inCampusBounds(lat, lon)) {
      return res.status(400).json({ error: 'coordinates outside campus bounds' });
    }

    const [byId, byName] = await Promise.all([
      pg(`places?place_id=eq.${encodeURIComponent(id)}&select=place_id`),
      pg(`places?place_name=eq.${encodeURIComponent(name || id)}&select=place_id`),
    ]);
    if (byId.length) return res.status(400).json({ error: 'place_id already exists' });
    if (byName.length) return res.status(400).json({ error: 'place_name already exists' });

    await pg('places', {
      method: 'POST',
      body: JSON.stringify([{ place_id: id, place_name: name || id, latitude: lat, longitude: lon, altitude: null }]),
    });

    res.status(200).json({ id, name: name || id, lat, lon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

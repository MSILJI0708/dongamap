const { pg } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  try {
    const [placeRows, roadRows] = await Promise.all([
      pg('places?select=place_id,place_name,latitude,longitude'),
      pg('roads?select=from_place,to_place,distance,time,network_category,curve_offset,direction'),
    ]);

    const places = placeRows
      .filter(r => r.latitude !== null && r.longitude !== null)
      .map(r => ({ id: r.place_id, name: r.place_name, lat: r.latitude, lon: r.longitude }));

    const edges = roadRows.map(r => ({
      from: r.from_place,
      to: r.to_place,
      dist: r.distance,
      time: r.time,
      category: r.network_category,
      curve: r.curve_offset || 0,
      direction: r.direction || undefined,
    }));

    res.status(200).json({ places, edges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

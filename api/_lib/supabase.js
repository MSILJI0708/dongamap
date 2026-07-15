const SUPABASE_URL = 'https://ypambdtwpnjzqshwyutc.supabase.co';

function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

// Thin wrapper around Supabase's PostgREST API using the service_role key
// (server-side only, bypasses RLS). `path` is the part after /rest/v1/.
async function pg(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Supabase ${res.status}: ${text}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const CAMPUS_BOUNDS = { latMin: 35.105, latMax: 35.125, lonMin: 128.958, lonMax: 128.978 };
function inCampusBounds(lat, lon) {
  return lat >= CAMPUS_BOUNDS.latMin && lat <= CAMPUS_BOUNDS.latMax &&
         lon >= CAMPUS_BOUNDS.lonMin && lon <= CAMPUS_BOUNDS.lonMax;
}

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLambda = (lon2 - lon1) * Math.PI / 180;
  const s = Math.sin(dPhi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

module.exports = { pg, CAMPUS_BOUNDS, inCampusBounds, haversineM, readJsonBody };

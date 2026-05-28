// ─────────────────────────────────────────────
//  APEX AI — Netlify Signal Bridge Function
//  Uses Netlify Blobs — NO external services
//  NO API keys needed. Just deploy and go.
// ─────────────────────────────────────────────

const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {

  // ── CORS preflight ──────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  const store = getStore('apex-signals');

  // ── GET: EA polls for pending signals ───────
  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get('queue');
      const queue = raw ? JSON.parse(raw) : [];
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify(queue)
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // ── POST: Web app sends a new trade signal ──
  if (event.httpMethod === 'POST') {
    try {
      const signal = JSON.parse(event.body);

      if (!signal.symbol || !signal.action) {
        return {
          statusCode: 400,
          headers: corsHeaders(),
          body: JSON.stringify({ error: 'Missing symbol or action' })
        };
      }

      // Read current queue
      const raw = await store.get('queue');
      const queue = raw ? JSON.parse(raw) : [];

      const newSignal = {
        id: Date.now().toString(),
        symbol: signal.symbol,
        action: signal.action.toUpperCase(),
        lot: parseFloat(signal.lot) || 0.01,
        trades: parseInt(signal.trades) || 1,
        sl: parseFloat(signal.sl) || 0,
        tp: parseFloat(signal.tp) || 0,
        entry: signal.entry || 'MARKET',
        comment: 'APEX AI',
        timestamp: new Date().toISOString(),
        status: 'PENDING'
      };

      queue.push(newSignal);
      await store.set('queue', JSON.stringify(queue));

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true, id: newSignal.id })
      };

    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // ── DELETE: EA marks signal as done ─────────
  if (event.httpMethod === 'DELETE') {
    try {
      const { id } = JSON.parse(event.body);

      const raw = await store.get('queue');
      const queue = raw ? JSON.parse(raw).filter(s => s.id !== id) : [];
      await store.set('queue', JSON.stringify(queue));

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ success: true })
      };

    } catch (err) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: corsHeaders(),
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
}

// ─────────────────────────────────────────────
//  APEX AI — Netlify Signal Bridge
//  Uses in-memory queue — no external storage
//  Simple, fast, zero dependencies
// ─────────────────────────────────────────────

// In-memory signal queue (persists while function is warm)
let signalQueue = [];

exports.handler = async function(event) {

  // ── CORS preflight ──────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  // ── Health check / ping ──────────────────────
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    if (params.ping) {
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ status: 'online', queue: signalQueue.length })
      };
    }
    // EA polls for pending signals
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(signalQueue)
    };
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

      signalQueue.push(newSignal);

      // Keep queue max 50 signals
      if (signalQueue.length > 50) signalQueue = signalQueue.slice(-50);

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
      signalQueue = signalQueue.filter(s => s.id !== id);
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

let currentSignal = null;
let confirmations = [];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    const type = (event.queryStringParameters || {}).type;
    if (type === 'confirmations') {
      return { statusCode: 200, headers, body: JSON.stringify({ confirmations: confirmations.slice(-20) }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ signal: currentSignal }) };
  }

  if (event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch(e) {}

    if (body.type === 'trade_confirm') {
      confirmations.push({ ...body, time: new Date().toISOString() });
      if (confirmations.length > 50) confirmations = confirmations.slice(-50);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    if (body.type === 'trade_closed') {
      confirmations.push({ ...body, closed: true, time: new Date().toISOString() });
      if (confirmations.length > 50) confirmations = confirmations.slice(-50);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    const { action, symbol, sl, tp, lot, trades } = body;
    if (!action || !symbol) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing action or symbol' }) };
    }

    currentSignal = {
      id: Date.now().toString(),
      action: action.toUpperCase(),
      symbol: symbol.toUpperCase(),
      sl: parseFloat(sl) || 0,
      tp: parseFloat(tp) || 0,
      lot: parseFloat(lot) || 0.01,
      trades: parseInt(trades) || 1,
      time: new Date().toISOString()
    };

    setTimeout(() => { currentSignal = null; }, 30000);

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, signal: currentSignal }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

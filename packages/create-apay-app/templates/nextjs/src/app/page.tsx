'use client';

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('crypto-alpha');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const testEndpoint = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(`/api/agent?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResponse({ status: res.status, data });
    } catch (err: any) {
      setResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#030712', color: '#f9fafb', fontFamily: 'system-ui, sans-serif', padding: '60px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '640px', width: '100%', background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '36px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'inline-block', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '9999px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
          A-PAY PROTOCOL ON BASE L2
        </div>
        <h1 style={{ fontSize: '26px', margin: '0 0 12px 0', fontWeight: 700 }}>Monetized Next.js AI Agent Starter</h1>
        <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: 1.6, margin: '0 0 24px 0' }}>
          This starter template exposes <code>/api/agent</code> with automated HTTP 402 crypto micropayments on Base Layer 2.
          Autonomous AI agents can seamlessly pay via EIP-712 session wallets.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter query..."
            style={{ flex: 1, background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '14px' }}
          />
          <button
            onClick={testEndpoint}
            disabled={loading}
            style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 20px', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Probing...' : 'Query /api/agent'}
          </button>
        </div>

        {response && (
          <div style={{ marginTop: '24px', background: '#090d16', border: '1px solid #1e293b', borderRadius: '10px', padding: '18px' }}>
            <div style={{ fontSize: '13px', color: response.status === 402 ? '#fbbf24' : '#34d399', fontWeight: 600, marginBottom: '10px' }}>
              HTTP Status: {response.status} {response.status === 402 ? '(Payment Required)' : '(Settled)'}
            </div>
            <pre style={{ margin: 0, fontSize: '12px', color: '#cbd5e1', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Embedded A-Pay Checkout Widget */}
      <script src="https://apayprotocol.org/v1.js" async></script>
    </main>
  );
}

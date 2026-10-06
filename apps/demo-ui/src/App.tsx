import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000';
const WS_URL = (import.meta as any).env?.VITE_WS_URL ?? 'http://localhost:3000';

interface TimelineItem {
  eventType: string;
  at: string;
}

export default function App() {
  const [customerId, setCustomerId] = useState('C-1234');
  const [planId, setPlanId] = useState('FLOW-FULL');
  const [simulateFailure, setSimulateFailure] = useState('none');
  const [activationId, setActivationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('-');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);

  // RF-08: timeline en vivo via WebSocket
  useEffect(() => {
    const socket = io(WS_URL);
    socket.on('activation-updated', (msg: any) => {
      if (activationId && (msg.activationId === activationId || msg.correlationId === activationId)) {
        if (msg.eventType) setTimeline((t) => [...t, { eventType: msg.eventType, at: new Date().toISOString() }]);
        if (msg.status) setStatus(msg.status);
        refresh();
      } else if (!activationId && msg?.activationId) {
        // muestra ultimo sin filtro
      }
    });
    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationId]);

  async function refresh() {
    if (!activationId) return;
    const res = await fetch(`${API_URL}/activations/${activationId}`);
    const data = await res.json();
    if (data?.status) setStatus(data.status);
    if (Array.isArray(data?.history)) setTimeline(data.history);
  }

  // Polling de respaldo cada 2s (por si WS falla en la demo)
  useEffect(() => {
    if (!activationId) return;
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationId]);

  async function contratar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeline([]);
    setStatus('PENDING');
    const res = await fetch(`${API_URL}/activations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, planId, simulateFailure }),
    });
    const data = await res.json();
    setActivationId(data.activationId);
    setStatus(data.status ?? 'PENDING');
    setTimeline([{ eventType: 'ActivationRequested', at: new Date().toISOString() }]);
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1>POC Activacion con Kafka</h1>
      <p>Contrata un plan y mira la timeline en vivo. Kafka UI en :8080, Mailhog en :8025.</p>
      <form onSubmit={contratar} style={{ display: 'grid', gap: 12, border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
        <label>customerId (key Kafka, RNF-02)<input value={customerId} onChange={(e) => setCustomerId(e.target.value)} /></label>
        <label>planId<input value={planId} onChange={(e) => setPlanId(e.target.value)} /></label>
        <label>Forzar fallo (fase 2)
          <select value={simulateFailure} onChange={(e) => setSimulateFailure(e.target.value)}>
            <option value="none">ninguno (camino feliz)</option>
            <option value="billing">billing</option>
            <option value="provisioning">provisioning</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Contratando...' : 'Contratar plan'}</button>
      </form>

      {activationId && (
        <div style={{ marginTop: 24 }}>
          <h2>Activacion {activationId} — <span>{status}</span></h2>
          <button onClick={refresh}>Refrescar (GET /activations/:id)</button>
          <ul>
            {timeline.map((t, i) => (
              <li key={i}>{t.eventType} <small>{t.at}</small></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

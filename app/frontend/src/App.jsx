import { useCallback, useEffect, useState } from 'react';

// API base is relative: Nginx proxies /api to the backend (BACKEND_URL at runtime).
const API = import.meta.env.VITE_API_URL || '';

async function getJson(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function StatusCard({ label, state, detail }) {
  return (
    <div className="card">
      <span className={`dot ${state}`} aria-hidden="true" />
      <div>
        <h3>{label}</h3>
        <p>{detail}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [records, setRecords] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await getJson('/api/status'));
      setApiError(false);
    } catch {
      setStatus(null);
      setApiError(true);
    }
    try {
      setRecords((await getJson('/api/records')).records);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    const res = await fetch(`${API}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {};
      setFormError(body.details?.join(', ') || 'Could not save the record.');
      return;
    }
    setTitle('');
    setDescription('');
    refresh();
  }

  const dbOk = status?.database === 'connected';

  return (
    <main className="container">
      <header>
        <h1>MG Kubernetes Platform Dashboard</h1>
        <button onClick={refresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh status'}
        </button>
      </header>

      <section className="grid" aria-label="System status">
        <StatusCard label="Application" state="ok" detail="Frontend is running" />
        <StatusCard
          label="Backend API"
          state={apiError ? 'down' : status ? 'ok' : 'warn'}
          detail={apiError ? 'Unreachable' : status ? `Up ${status.uptimeSeconds}s` : 'Checking…'}
        />
        <StatusCard
          label="Database"
          state={status ? (dbOk ? 'ok' : 'down') : 'warn'}
          detail={status ? (dbOk ? 'Connected' : 'Disconnected') : 'Unknown'}
        />
      </section>

      <section>
        <h2>Add record</h2>
        <form onSubmit={submit}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={120} required />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={1000}
          />
          <button type="submit">Create</button>
        </form>
        {formError && <p className="error" role="alert">{formError}</p>}
      </section>

      <section>
        <h2>Records ({records.length})</h2>
        {records.length === 0 ? (
          <p className="muted">No records yet.</p>
        ) : (
          <ul className="records">
            {records.map((r) => (
              <li key={r.id}>
                <strong>{r.title}</strong>
                {r.description && <span>{r.description}</span>}
                <time>{new Date(r.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

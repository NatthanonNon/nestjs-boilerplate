import { formatStatus } from './utils/format';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10001/api/v1';

export default function App() {
  return (
    <div className="page">
      <header className="hero">
        <p className="badge">NestJS Monorepo</p>
        <h1>API + Web boilerplate</h1>
        <p className="subtitle">
          Frontend workspace ready. API lives at <span className="inline-code">{apiUrl}</span>.
        </p>
      </header>
      <section className="card">
        <h2>Status</h2>
        <p className="status">{formatStatus('ready')}</p>
        <p className="hint">
          Run <span className="inline-code">npm run dev</span> for the API and{' '}
          <span className="inline-code">npm run dev:web</span> for this UI.
        </p>
      </section>
    </div>
  );
}

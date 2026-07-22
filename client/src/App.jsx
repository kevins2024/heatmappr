import { useState } from 'react';
import Questionnaire from './components/Questionnaire';
import TaxMap from './components/TaxMap';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function App() {
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(inputs) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setTaxData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setTaxData(null);
    setError(null);
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={styles.loading}>Calculating tax burden across 3,200+ counties…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#c0392b' }}>Error: {error}</p>
        <button onClick={handleReset} style={styles.btn}>Try Again</button>
      </div>
    );
  }

  if (taxData) {
    return <TaxMap taxData={taxData} onReset={handleReset} />;
  }

  return <Questionnaire onSubmit={handleSubmit} />;
}

const styles = {
  center: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif',
  },
  loading: { fontSize: '1.1rem', color: '#555' },
  btn: {
    marginTop: '1rem', padding: '0.5rem 1.2rem', cursor: 'pointer',
    background: '#2c3e50', color: '#fff', border: 'none', borderRadius: 4,
  },
};

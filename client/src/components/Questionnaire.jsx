import { useState } from 'react';

const INCOME_PRESETS = [20000, 50000, 75000, 100000, 150000, 200000, 300000, 500000];

export default function Questionnaire({ onSubmit }) {
  const [filingStatus, setFilingStatus] = useState('single');
  const [income, setIncome] = useState(75000);
  const [estimateSpending, setEstimateSpending] = useState(true);
  const [annualSpending, setAnnualSpending] = useState(22500);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      income: Number(income),
      filingStatus,
      annualSpending: estimateSpending ? Number(income) * 0.3 : Number(annualSpending),
    });
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Tax Burden Heatmap</h1>
        <p style={s.subtitle}>
          See how your combined income + sales tax burden compares across every US county.
        </p>

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Filing status */}
          <div style={s.field}>
            <label style={s.label}>Filing Status</label>
            <div style={s.radioGroup}>
              {[['single','Single'],['joint','Married Filing Jointly']].map(([val, label]) => (
                <label key={val} style={s.radioLabel}>
                  <input
                    type="radio"
                    value={val}
                    checked={filingStatus === val}
                    onChange={() => setFilingStatus(val)}
                    style={{ marginRight: 6 }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Income */}
          <div style={s.field}>
            <label style={s.label}>
              Annual Gross Income: <strong>{formatDollar(income)}</strong>
            </label>
            <input
              type="range"
              min={20000} max={500000} step={1000}
              value={income}
              onChange={e => {
                setIncome(e.target.value);
                if (estimateSpending) setAnnualSpending(Math.round(e.target.value * 0.3));
              }}
              style={s.slider}
            />
            <div style={s.presets}>
              {INCOME_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setIncome(p);
                    if (estimateSpending) setAnnualSpending(Math.round(p * 0.3));
                  }}
                  style={{ ...s.presetBtn, ...(Number(income) === p ? s.presetBtnActive : {}) }}
                >
                  {formatDollarShort(p)}
                </button>
              ))}
            </div>
          </div>

          {/* Spending */}
          <div style={s.field}>
            <label style={s.label}>Annual Spending on Taxable Goods</label>
            <label style={s.checkLabel}>
              <input
                type="checkbox"
                checked={estimateSpending}
                onChange={e => setEstimateSpending(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Estimate for me (30% of income = {formatDollar(Math.round(income * 0.3))})
            </label>
            {!estimateSpending && (
              <input
                type="number"
                value={annualSpending}
                min={0}
                step={500}
                onChange={e => setAnnualSpending(e.target.value)}
                style={s.input}
                placeholder="e.g. 25000"
              />
            )}
          </div>

          <button type="submit" style={s.submit}>Generate Tax Map →</button>
        </form>
      </div>
    </div>
  );
}

function formatDollar(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatDollarShort(n) {
  if (n >= 1000000) return `$${n / 1000000}M`;
  if (n >= 1000) return `$${n / 1000}k`;
  return `$${n}`;
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f4f6f8', fontFamily: 'system-ui, sans-serif', padding: '2rem',
  },
  card: {
    background: '#fff', borderRadius: 12, padding: '2.5rem',
    maxWidth: 520, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  title: { margin: '0 0 0.25rem', fontSize: '1.8rem', color: '#1a1a2e' },
  subtitle: { margin: '0 0 2rem', color: '#666', lineHeight: 1.5 },
  form: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontWeight: 600, color: '#333', fontSize: '0.95rem' },
  radioGroup: { display: 'flex', gap: '1.5rem' },
  radioLabel: { cursor: 'pointer', color: '#444' },
  slider: { width: '100%', accentColor: '#e74c3c' },
  presets: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' },
  presetBtn: {
    padding: '0.2rem 0.6rem', border: '1px solid #ddd', borderRadius: 4,
    background: '#f8f8f8', cursor: 'pointer', fontSize: '0.8rem', color: '#555',
  },
  presetBtnActive: { background: '#e74c3c', color: '#fff', borderColor: '#e74c3c' },
  checkLabel: { cursor: 'pointer', color: '#444', display: 'flex', alignItems: 'center' },
  input: {
    padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6,
    fontSize: '1rem', marginTop: '0.25rem',
  },
  submit: {
    padding: '0.75rem', background: '#e74c3c', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
    marginTop: '0.5rem',
  },
};

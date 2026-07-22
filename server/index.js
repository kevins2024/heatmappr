import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import NodeCache from 'node-cache';
import crypto from 'crypto';

const app = express();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const cache = new NodeCache({ stdTTL: 3600 });

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

function calcIncomeTax(income, brackets) {
  let tax = 0;
  for (const b of brackets) {
    if (income <= b.bracket_min) break;
    const slice = Math.min(income, b.bracket_max ?? Infinity) - b.bracket_min;
    tax += slice * parseFloat(b.rate);
  }
  return tax;
}

app.post('/api/calculate', async (req, res) => {
  const { income, filingStatus, annualSpending } = req.body;

  if (!income || !filingStatus) {
    return res.status(400).json({ error: 'income and filingStatus are required' });
  }

  const spending = annualSpending ?? income * 0.3;
  const cacheKey = crypto.createHash('md5')
    .update(`${income}-${filingStatus}-${spending}`)
    .digest('hex');

  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const [bracketsResult, salesResult, countiesResult] = await Promise.all([
      pool.query(
        `SELECT state_fips, bracket_min, bracket_max, rate
         FROM state_income_tax
         WHERE filing_status = $1
         ORDER BY state_fips, bracket_min`,
        [filingStatus]
      ),
      pool.query('SELECT state_fips, combined_rate FROM sales_tax'),
      pool.query('SELECT county_fips, state_fips FROM counties'),
    ]);

    const salesMap = Object.fromEntries(
      salesResult.rows.map(r => [r.state_fips, r])
    );

    const bracketsByState = {};
    for (const row of bracketsResult.rows) {
      (bracketsByState[row.state_fips] ??= []).push(row);
    }

    const result = countiesResult.rows.map(county => {
      const sf = county.state_fips;
      const stateBrackets = bracketsByState[sf] ?? [];
      const salesRow = salesMap[sf] ?? { combined_rate: 0 };

      const incomeTax = calcIncomeTax(income, stateBrackets);
      const salesBurden = spending * parseFloat(salesRow.combined_rate);
      const totalBurden = incomeTax + salesBurden;
      const effectiveRate = totalBurden / income;

      return {
        county_fips: county.county_fips,
        state_fips: sf,
        effective_rate: parseFloat(effectiveRate.toFixed(4)),
        income_tax_rate: parseFloat((incomeTax / income).toFixed(4)),
        sales_tax_rate: parseFloat(parseFloat(salesRow.combined_rate).toFixed(4)),
      };
    });

    cache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Calculation failed' });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on :${PORT}`));

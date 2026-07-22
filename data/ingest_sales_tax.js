import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// 2025 Tax Foundation state + avg local sales tax rates
// Source: taxfoundation.org/data/all/state/state-and-local-sales-tax-rates
const SALES_TAX_RATES = [
  { abbr:'AL', fips:'01', state:0.0400, local:0.0524, combined:0.0924 },
  { abbr:'AK', fips:'02', state:0.0000, local:0.0176, combined:0.0176 },
  { abbr:'AZ', fips:'04', state:0.0560, local:0.0280, combined:0.0840 },
  { abbr:'AR', fips:'05', state:0.0650, local:0.0297, combined:0.0947 },
  { abbr:'CA', fips:'06', state:0.0725, local:0.0157, combined:0.0882 },
  { abbr:'CO', fips:'08', state:0.0290, local:0.0491, combined:0.0781 },
  { abbr:'CT', fips:'09', state:0.0635, local:0.0000, combined:0.0635 },
  { abbr:'DE', fips:'10', state:0.0000, local:0.0000, combined:0.0000 },
  { abbr:'DC', fips:'11', state:0.0600, local:0.0000, combined:0.0600 },
  { abbr:'FL', fips:'12', state:0.0600, local:0.0103, combined:0.0703 },
  { abbr:'GA', fips:'13', state:0.0400, local:0.0330, combined:0.0730 },
  { abbr:'HI', fips:'15', state:0.0400, local:0.0044, combined:0.0444 },
  { abbr:'ID', fips:'16', state:0.0600, local:0.0008, combined:0.0608 },
  { abbr:'IL', fips:'17', state:0.0625, local:0.0244, combined:0.0869 },
  { abbr:'IN', fips:'18', state:0.0700, local:0.0000, combined:0.0700 },
  { abbr:'IA', fips:'19', state:0.0600, local:0.0094, combined:0.0694 },
  { abbr:'KS', fips:'20', state:0.0650, local:0.0235, combined:0.0885 },
  { abbr:'KY', fips:'21', state:0.0600, local:0.0000, combined:0.0600 },
  { abbr:'LA', fips:'22', state:0.0445, local:0.0556, combined:0.1001 },
  { abbr:'ME', fips:'23', state:0.0550, local:0.0000, combined:0.0550 },
  { abbr:'MD', fips:'24', state:0.0600, local:0.0000, combined:0.0600 },
  { abbr:'MA', fips:'25', state:0.0625, local:0.0000, combined:0.0625 },
  { abbr:'MI', fips:'26', state:0.0600, local:0.0000, combined:0.0600 },
  { abbr:'MN', fips:'27', state:0.0688, local:0.0052, combined:0.0740 },
  { abbr:'MS', fips:'28', state:0.0700, local:0.0070, combined:0.0770 },
  { abbr:'MO', fips:'29', state:0.0423, local:0.0418, combined:0.0841 },
  { abbr:'MT', fips:'30', state:0.0000, local:0.0000, combined:0.0000 },
  { abbr:'NE', fips:'31', state:0.0550, local:0.0142, combined:0.0692 },
  { abbr:'NV', fips:'32', state:0.0685, local:0.0132, combined:0.0817 },
  { abbr:'NH', fips:'33', state:0.0000, local:0.0000, combined:0.0000 },
  { abbr:'NJ', fips:'34', state:0.0663, local:0.0003, combined:0.0666 },
  { abbr:'NM', fips:'35', state:0.0500, local:0.0247, combined:0.0747 },
  { abbr:'NY', fips:'36', state:0.0400, local:0.0452, combined:0.0852 },
  { abbr:'NC', fips:'37', state:0.0475, local:0.0222, combined:0.0697 },
  { abbr:'ND', fips:'38', state:0.0500, local:0.0185, combined:0.0685 },
  { abbr:'OH', fips:'39', state:0.0575, local:0.0147, combined:0.0722 },
  { abbr:'OK', fips:'40', state:0.0450, local:0.0444, combined:0.0894 },
  { abbr:'OR', fips:'41', state:0.0000, local:0.0000, combined:0.0000 },
  { abbr:'PA', fips:'42', state:0.0600, local:0.0034, combined:0.0634 },
  { abbr:'RI', fips:'44', state:0.0700, local:0.0000, combined:0.0700 },
  { abbr:'SC', fips:'45', state:0.0600, local:0.0126, combined:0.0726 },
  { abbr:'SD', fips:'46', state:0.0420, local:0.0188, combined:0.0608 },
  { abbr:'TN', fips:'47', state:0.0700, local:0.0253, combined:0.0953 },
  { abbr:'TX', fips:'48', state:0.0625, local:0.0194, combined:0.0819 },
  { abbr:'UT', fips:'49', state:0.0485, local:0.0089, combined:0.0574 },
  { abbr:'VT', fips:'50', state:0.0600, local:0.0018, combined:0.0618 },
  { abbr:'VA', fips:'51', state:0.0530, local:0.0043, combined:0.0573 },
  { abbr:'WA', fips:'53', state:0.0650, local:0.0275, combined:0.0925 },
  { abbr:'WV', fips:'54', state:0.0600, local:0.0044, combined:0.0644 },
  { abbr:'WI', fips:'55', state:0.0500, local:0.0043, combined:0.0543 },
  { abbr:'WY', fips:'56', state:0.0400, local:0.0135, combined:0.0535 },
];

async function run() {
  console.log('Inserting sales tax rates for all states...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sales_tax');
    for (const r of SALES_TAX_RATES) {
      await client.query(
        `INSERT INTO sales_tax (state_fips, state_abbr, state_rate, avg_local_rate, combined_rate)
         VALUES ($1,$2,$3,$4,$5)`,
        [r.fips, r.abbr, r.state, r.local, r.combined]
      );
    }
    await client.query('COMMIT');
    console.log(`Inserted ${SALES_TAX_RATES.length} state sales tax rows.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });

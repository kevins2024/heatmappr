import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const STATE_ABBR = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '11':'DC','12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA',
  '20':'KS','21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
  '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM',
  '36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR','42':'PA','44':'RI',
  '45':'SC','46':'SD','47':'TN','48':'TX','49':'UT','50':'VT','51':'VA','53':'WA',
  '54':'WV','55':'WI','56':'WY',
};

async function run() {
  const url = 'https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt';
  console.log('Fetching county FIPS from Census...');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  const rows = [];
  for (const line of text.split('\n')) {
    // Format: STATE|STATEFP|COUNTYFP|COUNTYNS|COUNAME
    const parts = line.split('|');
    if (parts.length < 5 || parts[0] === 'STATE') continue;
    const stateFips = parts[1].trim().padStart(2, '0');
    const countyFips = parts[2].trim().padStart(3, '0');
    const countyName = parts[4].trim();
    const fullFips = stateFips + countyFips;
    const stateAbbr = STATE_ABBR[stateFips] ?? '??';
    if (stateFips && countyFips && countyName) {
      rows.push([fullFips, stateFips, stateAbbr, countyName]);
    }
  }

  console.log(`Inserting ${rows.length} counties in bulk...`);
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM counties');

    // Build one multi-row INSERT to avoid statement timeout from 3k round trips
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const values = [];
      const params = [];
      chunk.forEach(([fips, sf, sa, name], j) => {
        const base = j * 4;
        values.push(`($${base+1},$${base+2},$${base+3},$${base+4})`);
        params.push(fips, sf, sa, name);
      });
      await client.query(
        `INSERT INTO counties (county_fips, state_fips, state_abbr, county_name) VALUES ${values.join(',')} ON CONFLICT DO NOTHING`,
        params
      );
      console.log(`  inserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
    }
    console.log('Done.');
  } catch (e) {
    throw e;
  } finally {
    client.release();
  }
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });

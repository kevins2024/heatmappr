CREATE TABLE IF NOT EXISTS counties (
  county_fips  CHAR(5) PRIMARY KEY,
  state_fips   CHAR(2),
  state_abbr   CHAR(2),
  county_name  VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS state_income_tax (
  id            SERIAL PRIMARY KEY,
  state_fips    CHAR(2),
  filing_status VARCHAR(10),  -- 'single' or 'joint'
  bracket_min   INTEGER,
  bracket_max   INTEGER,      -- NULL = top bracket
  rate          NUMERIC(6,4),
  tax_year      INTEGER DEFAULT 2025
);

CREATE INDEX IF NOT EXISTS idx_income_tax_state_filing
  ON state_income_tax (state_fips, filing_status, bracket_min);

CREATE TABLE IF NOT EXISTS sales_tax (
  state_fips     CHAR(2) PRIMARY KEY,
  state_abbr     CHAR(2),
  state_rate     NUMERIC(6,4),
  avg_local_rate NUMERIC(6,4),
  combined_rate  NUMERIC(6,4),
  tax_year       INTEGER DEFAULT 2025
);

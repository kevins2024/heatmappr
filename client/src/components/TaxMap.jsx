import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

export default function TaxMap({ taxData, onReset }) {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState(null);
  const [countyNames, setCountyNames] = useState({});
  const [clickedFips, setClickedFips] = useState(null);
  const [zctaData, setZctaData] = useState(null);
  const [loadingZcta, setLoadingZcta] = useState(false);

  const rateByFips = new Map(taxData.map(d => [d.county_fips, d]));
  const rates = taxData.map(d => d.effective_rate);
  const minRate = d3.min(rates);
  const maxRate = d3.max(rates);
  const colorScale = d3.scaleSequential()
    .domain([minRate, maxRate])
    .interpolator(d3.interpolateYlOrRd);

  const drawMap = useCallback((topo, zctaTopo) => {
    const counties = topojson.feature(topo, topo.objects.cb_2023_us_county_5m);
    const projection = d3.geoAlbersUsa().fitSize([960, 600], counties);
    const path = d3.geoPath().projection(projection);

    // Build county name lookup from TopoJSON properties
    const names = {};
    for (const f of counties.features) {
      names[f.properties.GEOID] = f.properties.NAME;
    }
    setCountyNames(names);

    const svg = d3.select(svgRef.current)
      .attr('viewBox', '0 0 960 600')
      .style('width', '100%')
      .style('display', 'block');

    svg.selectAll('*').remove();

    // County layer
    svg.append('g')
      .attr('class', 'counties')
      .selectAll('path')
      .data(counties.features)
      .join('path')
      .attr('d', path)
      .attr('fill', d => {
        const row = rateByFips.get(d.properties.GEOID);
        return row ? colorScale(row.effective_rate) : '#ccc';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.3)
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        const fips = d.properties.GEOID;
        const row = rateByFips.get(fips);
        setTooltip({
          x: event.clientX,
          y: event.clientY,
          county: d.properties.NAME,
          state: fips.slice(0, 2),
          row,
        });
      })
      .on('mouseleave', () => setTooltip(null))
      .on('click', async (event, d) => {
        const fips = d.properties.GEOID;
        const stateFips = fips.slice(0, 2);
        setClickedFips(fips);
        setZctaData(null);
        setLoadingZcta(true);
        try {
          const res = await fetch(`/zcta/${stateFips}.topo.json`);
          if (res.ok) {
            const ztopo = await res.json();
            setZctaData(ztopo);
          }
        } catch {
          // ZCTA file not available — silently skip
        } finally {
          setLoadingZcta(false);
        }
      });

    // ZCTA overlay
    if (zctaTopo && clickedFips) {
      const objKey = Object.keys(zctaTopo.objects)[0];
      const zctas = topojson.feature(zctaTopo, zctaTopo.objects[objKey]);
      svg.append('g')
        .attr('class', 'zctas')
        .selectAll('path')
        .data(zctas.features)
        .join('path')
        .attr('d', path)
        .attr('fill', d => {
          const stateFips = clickedFips.slice(0, 2);
          const row = rateByFips.get(clickedFips);
          return row ? colorScale(row.effective_rate) : '#ccc';
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .attr('fill-opacity', 0.85);
    }

    // Legend
    const legendW = 220, legendH = 12;
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'legend-grad');
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      grad.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', colorScale(minRate + t * (maxRate - minRate)));
    });

    const legend = svg.append('g').attr('transform', 'translate(20, 568)');
    legend.append('rect')
      .attr('width', legendW).attr('height', legendH)
      .style('fill', 'url(#legend-grad)');

    const legendScale = d3.scaleLinear()
      .domain([minRate, maxRate])
      .range([0, legendW]);
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => `${(d * 100).toFixed(1)}%`);
    legend.append('g')
      .attr('transform', `translate(0, ${legendH})`)
      .call(legendAxis)
      .select('.domain').remove();
  }, [taxData, zctaData, clickedFips]);

  useEffect(() => {
    fetch('/counties.topo.json')
      .then(r => r.json())
      .then(topo => drawMap(topo, zctaData))
      .catch(err => console.error('Failed to load counties TopoJSON:', err));
  }, [drawMap]);

  function handleBack() {
    setClickedFips(null);
    setZctaData(null);
  }

  return (
    <div style={{ position: 'relative', background: '#1a1a2e', minHeight: '100vh' }}>
      {/* Header bar */}
      <div style={s.header}>
        <span style={s.headerTitle}>Tax Burden Heatmap</span>
        <div style={s.headerActions}>
          {clickedFips && (
            <button onClick={handleBack} style={s.backBtn}>← Back to all counties</button>
          )}
          {loadingZcta && <span style={s.loadingMsg}>Loading ZIP codes…</span>}
          <button onClick={onReset} style={s.resetBtn}>New Search</button>
        </div>
      </div>

      {/* Map */}
      <svg ref={svgRef} style={{ background: '#1a1a2e' }} />

      {/* Tooltip */}
      {tooltip && (
        <div style={{ ...s.tooltip, left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div style={s.tooltipTitle}>{tooltip.county} County</div>
          {tooltip.row ? (
            <>
              <div>Income tax: <strong>{pct(tooltip.row.income_tax_rate)}</strong></div>
              <div>Sales tax: <strong>{pct(tooltip.row.sales_tax_rate)}</strong></div>
              <div style={{ borderTop: '1px solid #eee', marginTop: 4, paddingTop: 4 }}>
                Combined: <strong>{pct(tooltip.row.effective_rate)}</strong>
              </div>
            </>
          ) : (
            <div>No data</div>
          )}
        </div>
      )}
    </div>
  );
}

function pct(n) {
  return `${(n * 100).toFixed(2)}%`;
}

const s = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1.25rem', background: '#12122a', color: '#fff',
    fontFamily: 'system-ui, sans-serif',
  },
  headerTitle: { fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em' },
  headerActions: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  backBtn: {
    padding: '0.3rem 0.75rem', background: 'transparent', border: '1px solid #aaa',
    color: '#ddd', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem',
  },
  resetBtn: {
    padding: '0.3rem 0.75rem', background: '#e74c3c', border: 'none',
    color: '#fff', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem',
  },
  loadingMsg: { color: '#aaa', fontSize: '0.85rem' },
  tooltip: {
    position: 'fixed', pointerEvents: 'none', background: '#fff',
    border: '1px solid #ddd', borderRadius: 6, padding: '0.5rem 0.75rem',
    fontSize: '0.85rem', color: '#222', lineHeight: 1.5, zIndex: 100,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  tooltipTitle: { fontWeight: 700, marginBottom: 4 },
};

#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_PUBLIC="$SCRIPT_DIR/../client/public"

echo "=== Downloading county boundary shapefile ==="
curl -L -o /tmp/counties.zip \
  "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_county_5m.zip"

mkdir -p /tmp/county_shp
unzip -o /tmp/counties.zip -d /tmp/county_shp

echo "=== Converting to TopoJSON (requires mapshaper) ==="
if ! command -v mapshaper &> /dev/null; then
  echo "Installing mapshaper..."
  npm install -g mapshaper
fi

mapshaper /tmp/county_shp/cb_2023_us_county_5m.shp \
  -simplify 15% keep-shapes \
  -o format=topojson "$CLIENT_PUBLIC/counties.topo.json"

echo "=== County TopoJSON written to $CLIENT_PUBLIC/counties.topo.json ==="
ls -lh "$CLIENT_PUBLIC/counties.topo.json"

# Optional: ZCTA boundaries (large — skip for now, uncomment when needed)
# echo "=== Downloading ZCTA boundary shapefile ==="
# curl -L -o /tmp/zcta.zip \
#   "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_zcta520_500k.zip"
# unzip -o /tmp/zcta.zip -d /tmp/zcta_shp
# mkdir -p "$CLIENT_PUBLIC/zcta"
# mapshaper /tmp/zcta_shp/cb_2023_us_zcta520_500k.shp \
#   -simplify 20% keep-shapes \
#   -split ZCTA5CE20[0,2]  \
#   -o format=topojson "$CLIENT_PUBLIC/zcta/"

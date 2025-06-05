// Your NOAA API token here (replace with your actual token)
const NOAA_TOKEN = 'ebmpGijdQUXWKhQOWmCPNhcPVSYqlHDs';

// Initialize Leaflet map
const map = L.map('map').setView([35, -80], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 20
}).addTo(map);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Helper: get today's month-day string like "06-04"
function getTodayMonthDay() {
  const today = new Date();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${month}-${day}`;
}

// Fetch max temps for the given station & monthDay over 1991-2020
async function fetchTempsForDateRange(stationId, monthDay) {
  const years = Array.from({length: 2020 - 1991 + 1}, (_, i) => 1991 + i);
  const temps = [];

  for (const year of years) {
    const date = `${year}-${monthDay}`;
    const url = `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?datasetid=GHCND&datatypeid=TMAX&stationid=${stationId}&startdate=${date}&enddate=${date}&limit=1000`;

    try {
      const res = await fetch(url, {
        headers: { token: NOAA_TOKEN }
      });

      if (res.status !== 200) {
        console.error(`Error fetching data for ${date}: Status ${res.status}`);
        continue;
      }

      const data = await res.json();

      if (data.results && data.results.length > 0) {
        data.results.forEach(r => temps.push(r.value / 10)); // tenths °C → °C
      }
    } catch (err) {
      console.error(`Fetch error for ${date}:`, err);
    }
    await sleep(250);
  }
  
  return temps;
}

// Add NOAA Climate Normals layer with Esri Leaflet
L.esri.featureLayer({
  url: 'https://gis.ncdc.noaa.gov/arcgis/rest/services/cdo/normals/MapServer/1',
  style: () => ({ color: '#007BFF', weight: 1 }),
  onEachFeature: (feature, layer) => {
    layer.on('click', async () => {
      const stationId = feature.properties.STATION_ID;
      const stationName = feature.properties.STATION_NAME;

      // Show loading popup
      layer.bindPopup(`Loading max temps for ${stationName}...`).openPopup();

      const monthDay = getTodayMonthDay();
      const temps = await fetchTempsForDateRange(stationId, monthDay);

      if (temps.length === 0) {
        layer.setPopupContent(`<strong>${stationName}</strong><br>No data available for ${monthDay}`);
        return;
      }

      // Create container div for Plotly plot inside the popup
      const plotId = `plot-${stationId}`;
      let plotDiv = document.getElementById(plotId);

        if (!plotDiv) {
          plotDiv = document.createElement('div');
          plotDiv.id = plotId;
          plotDiv.style.width = '100%';
          plotDiv.style.height = '300px';
          document.body.appendChild(plotDiv);
        }
      const popupContent = `
        <strong>${stationName}</strong><br>
        Max Temps on ${monthDay} (1991-2020)<br>
        <div id="${plotId}" style="width: 300px; height: 250px;"></div>
      `;
      layer.setPopupContent(popupContent);

      // Delay to allow popup to render its content div
      setTimeout(() => {
        Plotly.newPlot(plotId, [{
          y: temps,
          type: 'box',
          boxpoints: 'all',
          jitter: 0.5,
          pointpos: -1.8,
          marker: {color: '#007BFF'}
        }], {
          margin: {t: 30, b: 40},
          yaxis: { title: 'Temperature (°C)' },
          title: `Max Temps on ${monthDay}`
        }, {responsive: true});
      }, 300);
    });

    // Optional: simple popup on hover or initial bind
    layer.bindPopup(`Station: ${feature.properties.STATION_NAME}`);
  }
}).addTo(map);

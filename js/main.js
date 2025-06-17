// Initialize the map centered on North Carolina
const map = L.map('map').setView([35.7796, -78.6382], 7);

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

// NOAA station example(s)
const stations = [
  {
    id: 'GHCND:USC00318744',
    name: 'Raleigh, NC',
    lat: 35.7796,
    lon: -78.6382,
  },
];

let lastSelectedStation = null;
let lastSelectedMarker = null;

// Helper function to plot data using Plotly
function plotData(stationName, data) {
  document.getElementById('station-name').textContent = stationName;

  const tminValues = data.tmin.map(d => d.value);
  const tmaxValues = data.tmax.map(d => d.value);

  const boxTmin = {
    y: tminValues,
    type: 'box',
    name: 'Tmin (°F)',
    boxpoints: 'outliers',
    marker: { color: 'blue' },
  };
  const boxTmax = {
    y: tmaxValues,
    type: 'box',
    name: 'Tmax (°F)',
    boxpoints: 'outliers',
    marker: { color: 'red' },
  };

  const scatterTmin = {
    x: data.tmin.map(d => d.year),
    y: tminValues,
    mode: 'markers',
    type: 'scatter',
    name: 'Tmin',
    marker: { color: 'blue' },
  };
  const scatterTmax = {
    x: data.tmax.map(d => d.year),
    y: tmaxValues,
    mode: 'markers',
    type: 'scatter',
    name: 'Tmax',
    marker: { color: 'red' },
  };

  Plotly.newPlot('boxplot-tmax', [boxTmax], {
    title: 'Daily Maximum Temperatures',
    margin: { t: 40, b: 40 },
  });

  Plotly.newPlot('boxplot-tmin', [boxTmin], {
    title: 'Daily Minimum Temperatures',
    margin: { t: 40, b: 40 },
  });

  Plotly.newPlot('scatterplot', [scatterTmin, scatterTmax], {
    title: 'Min & Max Temperatures by Year',
    xaxis: { title: 'Year', dtick: 2 },
    yaxis: { title: 'Temperature (°F)' },
    margin: { t: 50, b: 50 },
  });
}

// Add markers to map and handle click events
stations.forEach(station => {
  const marker = L.marker([station.lat, station.lon]).addTo(map);
  marker.bindPopup(`Click to load data for ${station.name}`);

  marker.on('click', () => {
    const dateInput = document.getElementById('datePicker');
    let month, day;

    if (dateInput && dateInput.value) {
      const selectedDate = new Date(dateInput.value);
      month = selectedDate.getMonth() + 1;
      day = selectedDate.getDate();
    } else {
      const now = new Date();
      month = now.getMonth() + 1;
      day = now.getDate();
    }

    marker.getPopup().setContent(`Loading data for ${station.name}...`).openOn(map);

    lastSelectedStation = station;
    lastSelectedMarker = marker;

    fetch(`https://climate-backend-9q9b.onrender.com/api/station?id=${station.id}&month=${month}&day=${day}`)
      .then(response => {
        if (!response.ok) throw new Error(`Network response was not OK (${response.status})`);
        return response.json();
      })
      .then(data => {
        const popupContent = `
          <strong>${station.name}</strong><br>
          Tmin observations: ${data.tmin.length}<br>
          Tmax observations: ${data.tmax.length}
        `;
        marker.getPopup().setContent(popupContent).openOn(map);

        plotData(station.name, data);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        marker.getPopup().setContent(`Error loading data for ${station.name}`).openOn(map);
      });
  });
});

// Date picker setup + change listener
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('datePicker');
  if (dateInput) {
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];

    dateInput.addEventListener('change', () => {
      if (lastSelectedStation && lastSelectedMarker) {
        const selectedDate = new Date(dateInput.value);
        const month = selectedDate.getMonth() + 1;
        const day = selectedDate.getDate();

        lastSelectedMarker.getPopup().setContent(`Loading data for ${lastSelectedStation.name}...`).openOn(map);

        fetch(`https://climate-backend-9q9b.onrender.com/api/station?id=${lastSelectedStation.id}&month=${month}&day=${day}`)
          .then(response => {
            if (!response.ok) throw new Error(`Network response was not OK (${response.status})`);
            return response.json();
          })
          .then(data => {
            const popupContent = `
              <strong>${lastSelectedStation.name}</strong><br>
              Tmin observations: ${data.tmin.length}<br>
              Tmax observations: ${data.tmax.length}
            `;
            lastSelectedMarker.getPopup().setContent(popupContent).openOn(map);

            plotData(lastSelectedStation.name, data);
          })
          .catch(err => {
            console.error('Fetch error:', err);
            lastSelectedMarker.getPopup().setContent(`Error loading data for ${lastSelectedStation.name}`).openOn(map);
          });
      }
    });
  }
});
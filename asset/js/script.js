
let lastKnownEarthquakeTime = null;
let earthquakeChart = null;

async function fetchEarthquakes() {
  try {
    const response = await fetch('https://api.boostr.cl/earthquakes/recent.json', { method: 'GET', headers: { accept: 'application/json' } });
    const res = await response.json();

    const earthquakes = res.data;

    if (!earthquakes || earthquakes.length === 0) {
      console.log("No hay sismos recientes.");
      return;
    }

    // Convertimos fecha+hora a objeto Date para cada sismo
    earthquakes.forEach(q => {
      q.datetime = new Date(`${q.date}T${q.hour}`);
    });

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const filteredQuakes = earthquakes.filter(q => q.datetime >= oneDayAgo);
    const sortedEarthquakes = [...filteredQuakes].sort((a, b) => b.datetime - a.datetime);
    const latest = sortedEarthquakes[0];

    if (!lastKnownEarthquakeTime || lastKnownEarthquakeTime !== latest.datetime.toISOString()) {
      document.getElementById('alertSound').play();
    }
    lastKnownEarthquakeTime = latest.datetime.toISOString();

    // Mostrar alerta con último sismo
    document.getElementById('alert-content').innerHTML = `${latest.date} ${latest.hour} - Magnitud ${latest.magnitude} en ${latest.place}`;
    document.getElementById('earthquake-alert').style.display = 'block';

    // Mapa con último sismo
    document.getElementById('map-container').innerHTML = `
      <iframe width="100%" height="220" frameborder="0" src="https://maps.google.com/maps?q=${latest.latitude},${latest.longitude}&z=5&output=embed"></iframe>`;

    // Top 3 sismos
    const topThree = [...sortedEarthquakes].sort((a,b) => parseFloat(b.magnitude) - parseFloat(a.magnitude)).slice(0, 3);
    const colors = ['red', 'yellow', 'green'];
    document.getElementById('top-quakes').innerHTML = topThree.map((q, i) => `
      <div class="quake-box ${colors[i]}">
        <div><strong>Top ${i+1}</strong></div>
        <div>Mag: ${q.magnitude}</div>
        <div>${q.place}</div>
        <div style="font-size:0.8rem;">${q.date} ${q.hour}</div>
      </div>`).join('');

    // Probabilidad simplificada (últimas 4 horas)
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const recentQuakes = sortedEarthquakes.filter(q => q.datetime >= fourHoursAgo);
    const cant = recentQuakes.length;
    let probFinal = cant * 10;
    probFinal = Math.min(probFinal, 100);
    let colorProb = probFinal >= 75 ? '#ff0000' : probFinal >= 50 ? '#ffa500' : '#4caf50';
    document.getElementById('probabilidad-container').innerHTML = `
      <div class="card mb-3 text-center" style="background-color: transparent; box-shadow: none; color: ${colorProb}; font-weight: 900; font-size: 2.5rem; letter-spacing: 0.15rem;">
        RIESGO DE SISMO FUERTE: ${probFinal}%
      </div>`;

    if(probFinal >= 70) {
      document.getElementById('zona-caliente').style.display = 'block';
      document.getElementById('zona-caliente').textContent = `Zona caliente: ${topThree[0].place}`;
    } else {
      document.getElementById('zona-caliente').style.display = 'none';
    }

    // === GRÁFICO DE MAGNITUDES ===
    const labels = [];
    const magnitudes = [];
    const backgroundColors = [];
    let maxMag = -Infinity, secondMag = -Infinity, thirdMag = -Infinity;

    // Buscar top 3 magnitudes en las últimas 24 horas
    recentQuakes.forEach(q => {
      const mag = parseFloat(q.magnitude);
      if (mag > maxMag) { 
        thirdMag = secondMag; 
        secondMag = maxMag; 
        maxMag = mag; 
      } else if (mag > secondMag) { 
        thirdMag = secondMag; 
        secondMag = mag; 
      } else if (mag > thirdMag) {
        thirdMag = mag;
      }
    });

    recentQuakes.forEach(q => {
      labels.push(new Date(q.datetime).toLocaleTimeString());
      magnitudes.push(parseFloat(q.magnitude));
      const mag = parseFloat(q.magnitude);
      backgroundColors.push(
        mag === maxMag ? 'rgba(255, 99, 132, 0.8)' :
        mag === secondMag ? 'rgba(255, 205, 86, 0.8)' :
        mag === thirdMag ? 'rgba(75, 192, 192, 0.8)' :
        'rgba(54, 162, 235, 0.8)'
      );
    });

    const ctx = document.getElementById('earthquakeChart').getContext('2d');
    if (earthquakeChart) earthquakeChart.destroy();
    earthquakeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Magnitud',
          data: magnitudes,
          backgroundColor: backgroundColors
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, max: 10 }
        }
      }
    });

    // === TABLA CON COLORES SEGÚN MAGNITUD ===
    let tableHtml = `<table><thead><tr><th>Fecha</th><th>Hora</th><th>Mag</th><th>Prof (km)</th><th>Ubicación</th></tr></thead><tbody>`;
    sortedEarthquakes.forEach((q, index) => {
      let rowClass = '';
      if (index === 0) rowClass = 'highlight-last';
      const mag = parseFloat(q.magnitude);
      if (mag >= 5) rowClass += ' high-mag';
      else if (mag >= 3) rowClass += ' mid-mag';
      else rowClass += ' low-mag';
      tableHtml += `<tr class="${rowClass.trim()}">
        <td>${q.date}</td>
        <td>${q.hour}</td>
        <td>${mag.toFixed(1)}</td>
        <td>${q.depth}</td>
        <td><a href="${q.info}" target="_blank" rel="noopener noreferrer">${q.place}</a></td>
      </tr>`;
    });
    tableHtml += `</tbody></table>`;
    document.getElementById('earthquakes-table').innerHTML = tableHtml;

    // Mostrar hora de actualización
    document.getElementById('last-update').textContent = `Actualizado: ${new Date().toLocaleString()}`;

  } catch(err) {
    console.error('Error al obtener datos:', err);
  }
}

fetchEarthquakes();
setInterval(fetchEarthquakes, 30000);

let earthquakeChart;

async function fetchEarthquakes() {
    try {
        // URL de la API de USGS para obtener sismos recientes a nivel mundial
        const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
        const data = await response.json();

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const earthquakes = data.features.filter(quake => new Date(quake.properties.time) >= oneDayAgo);

        if (earthquakes.length === 0) {
            document.getElementById('earthquakes-table').innerHTML = '<p class="text-center text-warning">No se encontraron sismos recientes.</p>';
            document.getElementById('highest-magnitude-info').textContent = '';
            return;
        }

        // Ordenar sismos por hora (Fecha) y luego invertir el orden para mostrar desde el más reciente
        const sortedEarthquakes = [...earthquakes].sort((a, b) => new Date(a.properties.time) - new Date(b.properties.time)).reverse();

        // Obtener los tres sismos con mayor magnitud
        const maxMagnitude = sortedEarthquakes.reduce((max, quake) => quake.properties.mag > max.properties.mag ? quake : max, sortedEarthquakes[0]);
        const secondHighest = sortedEarthquakes.reduce((second, quake) => quake.properties.mag > second.properties.mag && quake !== maxMagnitude ? quake : second, sortedEarthquakes[0]);
        const thirdHighest = sortedEarthquakes.reduce((third, quake) => quake.properties.mag > third.properties.mag && quake !== maxMagnitude && quake !== secondHighest ? quake : third, sortedEarthquakes[0]);

        const labels = [];
        const magnitudes = [];
        const backgroundColors = [];

        sortedEarthquakes.forEach((quake) => {
            labels.push(new Date(quake.properties.time).toLocaleTimeString());
            magnitudes.push(quake.properties.mag);

            // Asignar colores según la magnitud
            if (quake === maxMagnitude) {
                backgroundColors.push('rgba(255, 99, 132, 0.8)'); // Rojo
            } else if (quake === secondHighest) {
                backgroundColors.push('rgba(255, 205, 86, 0.8)'); // Amarillo
            } else if (quake === thirdHighest) {
                backgroundColors.push('rgba(75, 192, 192, 0.8)'); // Verde
            } else {
                backgroundColors.push('rgba(54, 162, 235, 0.8)'); // Azul
            }
        });

        // Crear gráfico de sismos
        const ctx = document.getElementById('earthquakeChart').getContext('2d');
        if (earthquakeChart) earthquakeChart.destroy();
        earthquakeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Magnitud del Sismo',
                    data: magnitudes,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

        let tableHtml = `
            <table class="table table-dark table-hover">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Magnitud</th>
                        <th>Profundidad (km)</th>
                        <th>Ubicación</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedEarthquakes.forEach((quake) => {
            let rowClass = '';
            
            // Asignar clases para los sismos de mayor, segundo y tercer lugar según magnitud
            if (quake === maxMagnitude) {
                rowClass = 'bg-danger'; // Rojo
            } else if (quake === secondHighest) {
                rowClass = 'bg-warning'; // Amarillo
            } else if (quake === thirdHighest) {
                rowClass = 'bg-success'; // Verde
            }

            tableHtml += `
                <tr class="${rowClass}">
                    <td>${new Date(quake.properties.time).toLocaleString()}</td>
                    <td>${quake.properties.mag}</td>
                    <td>${quake.geometry.coordinates[2]}</td>
                    <td>
                        <a href="https://www.google.com/maps?q=${quake.geometry.coordinates[1]},${quake.geometry.coordinates[0]}" target="_blank">
                            ${quake.properties.place}
                        </a>
                    </td>
                </tr>`;
        });

        tableHtml += '</tbody></table>';
        document.getElementById('earthquakes-table').innerHTML = tableHtml;

        // Actualizar el título con la hora de la última actualización
        document.title = `Sismos Recientes - Última actualización: ${now.toLocaleTimeString()}`;

        // Mostrar la hora de la última actualización debajo del título
        document.getElementById('last-update').textContent = `Última actualización: ${now.toLocaleTimeString()}`;
    } catch (error) {
        console.error('Error al obtener los datos de la API:', error);
        document.getElementById('earthquakes-table').innerHTML = '<p class="text-center text-danger">Error al cargar los datos. Intenta nuevamente más tarde.</p>';
    }
}

window.onload = function() {
    fetchEarthquakes();
    setInterval(fetchEarthquakes, 10000); // Actualizar cada 10 segundos
};

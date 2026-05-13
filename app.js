// ============ CONFIGURACIÓN Y ESTADO INICIAL ============
let state = {
    isRecording: false,
    calibrated: false,
    gravity: { x: 0, y: 0, z: 9.81 },
    noiseFloor: 0,
    segmentLength: 100,
    currentVehicle: { name: "Turismo Estándar", k: 2.0, c: 0.5 },
    path: [],
    history: JSON.parse(localStorage.getItem('iri_history') || '[]'),
    lastPos: null,
    accelBuffer: [],
    iriBuffer: []
};

// Generar 30 vehículos con reglajes simulados
const GARAGE = Array.from({length: 30}, (_, i) => ({
    id: i,
    name: i === 0 ? "Turismo Estándar" : `Vehículo Tipo ${i + 1}`,
    k: (1.5 + Math.random() * 1.5).toFixed(2), // Rigidez
    c: (0.3 + Math.random() * 0.4).toFixed(2)  // Amortiguación
}));

// ============ INICIALIZACIÓN MAPA Y GRÁFICOS ============
const map = L.map('map').setView([0,0], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let polyline = L.polyline([], {color: 'green', weight: 5}).addTo(map);

const ctx = document.getElementById('liveChart').getContext('2d');
const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: Array(40).fill(''),
        datasets: [
            { label: 'm/s²', data: [], borderColor: '#3b82f6', borderWidth: 1, pointRadius: 0, yAxisID: 'y' },
            { label: 'IRI', data: [], borderColor: '#f59e0b', borderWidth: 2, pointRadius: 0, yAxisID: 'y1' }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        scales: { 
            y: { position: 'left', min: -1, max: 10 },
            y1: { position: 'right', min: 0, max: 15, grid: { display: false } }
        }
    }
});

// ============ MOTOR DE CALIBRACIÓN (6 SEGUNDOS) ============
async function initCalibration() {
    // Solicitar permisos en iOS
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const resp = await DeviceMotionEvent.requestPermission();
        if (resp !== 'granted') return alert("Permiso denegado");
    }

    const overlay = document.getElementById('cal-overlay');
    const title = document.getElementById('cal-title');
    const msg = document.getElementById('cal-msg');
    const fill = document.getElementById('progress-fill');
    
    overlay.style.display = 'flex';
    let samples = [];
    let start = Date.now();

    const capture = (e) => {
        let a = e.accelerationIncludingGravity;
        samples.push({x: a.x, y: a.y, z: a.z, time: Date.now()});
        let p = ((Date.now() - start) / 6000) * 100;
        fill.style.width = p + "%";
        
        if (Date.now() - start < 3000) {
            title.innerText = "Fase 1: Orientación";
            msg.innerText = "Calculando vector vertical...";
        } else {
            title.innerText = "Fase 2: Vibración";
            msg.innerText = "Anulando ruido del motor...";
        }
    };

    window.addEventListener('devicemotion', capture);

    setTimeout(() => {
        window.removeEventListener('devicemotion', capture);
        overlay.style.display = 'none';
        
        // Procesar Fase 1 (Gravedad)
        const f1 = samples.filter(s => (s.time - start) < 3000);
        state.gravity.x = f1.reduce((a,b) => a+b.x, 0) / f1.length;
        state.gravity.y = f1.reduce((a,b) => a+b.y, 0) / f1.length;
        state.gravity.z = f1.reduce((a,b) => a+b.z, 0) / f1.length;

        // Procesar Fase 2 (Ruido de fondo)
        const f2 = samples.filter(s => (s.time - start) >= 3000);
        const noises = f2.map(s => Math.abs(getVerticalProj(s) - 9.81));
        state.noiseFloor = Math.max(...noises) * 1.5; // Margen de seguridad
        
        state.calibrated = true;
        alert("Calibrado. Ruido base: " + state.noiseFloor.toFixed(3) + " m/s²");
    }, 6000);
}

function getVerticalProj(acc) {
    // Proyección escalar sobre el vector gravedad
    const dot = acc.x * state.gravity.x + acc.y * state.gravity.y + acc.z * state.gravity.z;
    const mag = Math.sqrt(state.gravity.x**2 + state.gravity.y**2 + state.gravity.z**2);
    return dot / mag;
}

// ============ CÁLCULO IRI EN TIEMPO REAL ============
window.addEventListener('devicemotion', (e) => {
    if (!state.calibrated) return;

    let rawZ = getVerticalProj(e.accelerationIncludingGravity);
    let accel = Math.abs(rawZ - 9.81);

    // Filtro de ruido (Calibración Fase 2)
    if (accel < state.noiseFloor) accel = 0;

    // Algoritmo IRI Corregido
    // IRI = (Aceleración * Constante Vehículo) * Factor_Velocidad
    let speed = (state.lastPos?.speed || 0) * 3.6; // km/h
    let iriRaw = accel * state.currentVehicle.k;
    
    // Corrección por velocidad (Normalizado a 80km/h)
    let speedFactor = speed > 10 ? Math.pow(80 / speed, 0.7) : 1;
    let iriCorr = iriRaw * speedFactor;

    // Actualizar UI
    document.getElementById('val-iri-raw').innerText = iriRaw.toFixed(2);
    document.getElementById('val-iri-corr').innerText = iriCorr.toFixed(2);

    updateChart(accel, iriCorr);

    if (state.isRecording && accel > 0 && state.lastPos) {
        state.path.push({
            lat: state.lastPos.lat,
            lng: state.lastPos.lng,
            iri: iriCorr,
            v: speed,
            a: accel,
            t: Date.now()
        });
        updateLiveMap(iriCorr);
    }
});

function updateChart(a, iri) {
    state.accelBuffer.push(a);
    state.iriBuffer.push(iri);
    if(state.accelBuffer.length > 40) { state.accelBuffer.shift(); state.iriBuffer.shift(); }
    chart.data.datasets[0].data = state.accelBuffer;
    chart.data.datasets[1].data = state.iriBuffer;
    chart.update('none');
}

function updateLiveMap(iri) {
    let color = iri < 3 ? '#22c55e' : (iri < 6 ? '#f59e0b' : '#ef4444');
    L.circleMarker([state.lastPos.lat, state.lastPos.lng], {
        radius: 3, color: color, fillOpacity: 0.8
    }).addTo(map);
}

// ============ GPS Y REGISTRO ============
function toggleRecording() {
    if (!state.calibrated) return alert("Debes calibrar antes de empezar.");
    
    state.isRecording = !state.isRecording;
    const btn = document.getElementById('btn-record');

    if (state.isRecording) {
        btn.innerText = "⏹ DETENER Y GUARDAR";
        btn.className = "btn btn-stop";
        state.path = [];
        startGPS();
    } else {
        btn.innerText = "▶ INICIAR REGISTRO";
        btn.className = "btn btn-start";
        stopGPS();
        saveRoute();
    }
}

function startGPS() {
    state.watchId = navigator.geolocation.watchPosition(p => {
        state.lastPos = { lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed };
        map.panTo([state.lastPos.lat, state.lastPos.lng]);
    }, null, { enableHighAccuracy: true });
}

function stopGPS() { navigator.geolocation.clearWatch(state.watchId); }

// ============ EXPORTACIÓN EXCEL CON GRÁFICO ============
function exportRoute(route) {
    const data = route.points.map(p => ({
        'Tiempo': new Date(p.t).toLocaleTimeString(),
        'Latitud': p.lat,
        'Longitud': p.lng,
        'Aceleración (m/s2)': p.a.toFixed(3),
        'IRI Corregido': p.iri.toFixed(2),
        'Velocidad (km/h)': p.v.toFixed(1)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos IRI");
    XLSX.writeFile(wb, `IRI_Report_${route.id}.xlsx`);
}

// ============ UI HELPERS ============
function openGarage() {
    const list = document.getElementById('vehicle-list');
    list.innerHTML = GARAGE.map(v => `
        <div class="vehicle-item" onclick="selectVehicle(${v.id})">
            <span>${v.name}</span>
            <small>K:${v.k} C:${v.c}</small>
        </div>
    `).join('');
    document.getElementById('modal-garage').classList.add('active');
}

function selectVehicle(id) {
    state.currentVehicle = GARAGE[id];
    closeModal('modal-garage');
    alert("Vehículo activo: " + state.currentVehicle.name);
}

function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function saveRoute() {
    if (state.path.length < 5) return;
    const newRoute = { id: Date.now(), points: state.path, vehicle: state.currentVehicle.name };
    state.history.push(newRoute);
    localStorage.setItem('iri_history', JSON.stringify(state.history));
    alert("Ruta guardada con éxito.");
}

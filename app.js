// ============ CONFIGURACIÓN Y ESTADO ============
let state = {
  active: false,
  calibrated: false,
  gravity: { x: 0, y: 0, z: 9.81 },
  noise: 0.05,
  segmentLength: 100,
  currentPos: null,
  vehicle: { brand: "Volkswagen", model: "Passat B6", year: "2005-2010", k: 2.1 },
  accelData: [],
  iriData: []
};

// ============ GARAJE: 30 COCHES MÁS VENDIDOS EN ESPAÑA + PETICIONES ============
const VEHICLES = [
  { brand: "Volkswagen", model: "Passat B6", year: "2005-2010", type: "Combustión", k: 2.1 },
  { brand: "Peugeot", model: "307 SW", year: "2002", type: "Combustión", k: 1.95 },
  { brand: "Citroën", model: "ë-C4", year: "2020-2024", type: "Eléctrico", k: 1.85 },
  { brand: "Dacia", model: "Sandero", year: "2023", type: "Combustión", k: 2.3 },
  { brand: "Seat", model: "Arone", year: "2023", type: "Combustión", k: 2.0 },
  { brand: "Toyota", model: "Corolla", year: "2023", type: "Híbrido", k: 1.9 },
  { brand: "Tesla", model: "Model 3", year: "2023", type: "Eléctrico", k: 2.2 },
  { brand: "MG", model: "ZS", year: "2023", type: "Combustión", k: 2.1 },
  { brand: "Hyundai", model: "Tucson", year: "2023", type: "Combustión", k: 1.8 },
  { brand: "Kia", model: "Sportage", year: "2023", type: "Combustión", k: 1.85 },
  { brand: "Fiat", model: "500", year: "2023", type: "Híbrido", k: 2.4 },
  { brand: "Toyota", model: "C-HR", year: "2023", type: "Híbrido", k: 2.0 },
  { brand: "Seat", model: "Ibiza", year: "2023", type: "Combustión", k: 2.1 },
  { brand: "Peugeot", model: "2008", year: "2023", type: "Combustión", k: 1.9 },
  { brand: "Renault", model: "Clio", year: "2023", type: "Combustión", k: 2.0 },
  { brand: "Cupra", model: "Formentor", year: "2023", type: "Combustión", k: 2.2 },
  { brand: "Volkswagen", model: "T-Roc", year: "2023", type: "Combustión", k: 1.9 },
  { brand: "Nissan", model: "Qashqai", year: "2023", type: "Híbrido", k: 1.8 },
  { brand: "Toyota", model: "Yaris", year: "2023", type: "Híbrido", k: 2.1 },
  { brand: "Citroën", model: "C3", year: "2023", type: "Combustión", k: 2.2 },
  { brand: "Kia", model: "Niro", year: "2023", type: "Híbrido/EV", k: 1.9 },
  { brand: "Dacia", model: "Duster", year: "2023", type: "Combustión", k: 2.4 },
  { brand: "Audi", model: "A3", year: "2023", type: "Combustión", k: 2.1 },
  { brand: "Ford", model: "Focus", year: "2023", type: "Combustión", k: 2.0 },
  { brand: "Mercedes", model: "Clase A", year: "2023", type: "Combustión", k: 2.1 },
  { brand: "BMW", model: "Serie 1", year: "2023", type: "Combustión", k: 2.2 },
  { brand: "Tesla", model: "Model Y", year: "2023", type: "Eléctrico", k: 2.1 },
  { brand: "Opel", model: "Corsa", year: "2023", type: "Combustión", k: 2.1 },
  { brand: "Hyundai", model: "Kona", year: "2023", type: "Eléctrico", k: 1.9 },
  { brand: "Volvo", model: "XC40", year: "2023", type: "Híbrido", k: 1.7 }
];

// ============ INICIALIZACIÓN MAPA INMEDIATA ============
const map = L.map('map', { zoomControl: false }).setView([40.4167, -3.7037], 15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
let userMarker = L.circleMarker([0,0], { radius: 8, color: '#3b82f6', fillOpacity: 1 }).addTo(map);

navigator.geolocation.watchPosition(p => {
  state.currentPos = { lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed };
  const ll = [p.coords.latitude, p.coords.longitude];
  userMarker.setLatLng(ll);
  if (!state.active) map.panTo(ll);
}, null, { enableHighAccuracy: true });

// ============ GRÁFICO CORREGIDO (LÍNEAS Y COLORES) ============
const ctx = document.getElementById('iriChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: Array(50).fill(''),
    datasets: [
      { 
        label: 'Acelerómetro (m/s²)', 
        data: [], 
        borderColor: '#64748b', 
        borderWidth: 1.5, 
        pointRadius: 0,
        fill: false 
      },
      { 
        label: 'IRI', 
        data: [], 
        borderWidth: 3, 
        pointRadius: 0,
        fill: false,
        segment: {
          borderColor: ctx => {
            const val = ctx.p1.parsed.y;
            return val < 2 ? '#10b981' : (val < 4 ? '#f59e0b' : '#ef4444');
          }
        }
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true, 
        labels: { color: '#f8fafc', usePointStyle: true, pointStyle: 'line', boxWidth: 30 } 
      }
    },
    scales: {
      y: { min: -1, max: 10, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { display: false }
    }
  }
});

// ============ LÓGICA DE SENSORES ============
window.addEventListener('devicemotion', e => {
  if (!state.calibrated) return;

  const acc = e.accelerationIncludingGravity;
  const dot = acc.x * state.gravity.x + acc.y * state.gravity.y + acc.z * state.gravity.z;
  const mag = Math.sqrt(state.gravity.x**2 + state.gravity.y**2 + state.gravity.z**2);
  let vAcc = Math.abs((dot / mag) - 9.81);

  if (vAcc < state.noise) vAcc = 0;

  const speedKmh = (state.currentPos?.speed || 0) * 3.6;
  const iriRaw = vAcc * state.vehicle.k;
  const speedFactor = speedKmh > 10 ? Math.pow(80 / speedKmh, 0.65) : 1;
  const iriCorr = iriRaw * speedFactor;

  document.getElementById('iri-raw').innerText = iriRaw.toFixed(2);
  document.getElementById('iri-corr').innerText = iriCorr.toFixed(2);

  state.accelData.push(vAcc);
  state.iriData.push(iriCorr);
  if(state.accelData.length > 50) { state.accelData.shift(); state.iriData.shift(); }
  
  chart.data.datasets[0].data = state.accelData;
  chart.data.datasets[1].data = state.iriData;
  chart.update('none');
});

// ============ FUNCIONES DE INTERFAZ ============
function startCalibration() {
  const btn = document.getElementById('btn-cal');
  btn.disabled = true; btn.innerText = "CALIBRANDO... NO MOVER";
  
  let samples = [];
  const capture = e => samples.push(e.accelerationIncludingGravity);
  window.addEventListener('devicemotion', capture);

  setTimeout(() => {
    window.removeEventListener('devicemotion', capture);
    const avg = {
      x: samples.reduce((a,b)=>a+b.x,0)/samples.length,
      y: samples.reduce((a,b)=>a+b.y,0)/samples.length,
      z: samples.reduce((a,b)=>a+b.z,0)/samples.length
    };
    state.gravity = avg;
    state.calibrated = true;
    btn.innerText = "SISTEMA CALIBRADO ✅";
    btn.style.background = "#10b981";
  }, 6000);
}

function toggleMeasurement() {
  state.active = !state.active;
  const btn = document.getElementById('btn-toggle');
  btn.innerText = state.active ? "⏹ DETENER MEDICIÓN" : "▶ INICIAR MEDICIÓN";
  btn.className = state.active ? "btn btn-stop" : "btn btn-main";
}

function cycleSegment() {
  const lengths = [20, 50, 100, 200];
  let idx = lengths.indexOf(state.segmentLength);
  state.segmentLength = lengths[(idx + 1) % lengths.length];
  document.getElementById('seg-val').innerText = state.segmentLength;
}

function openGarage() {
  const modal = document.getElementById('garage-modal');
  const list = document.getElementById('vehicle-list');
  list.innerHTML = VEHICLES.map((v, i) => `
    <div class="v-item" onclick="selectVehicle(${i})">
      <strong>${v.brand} ${v.model} (${v.year})</strong>
      <small style="color:#94a3b8">${v.type} - Coef: ${v.k}</small>
    </div>
  `).join('');
  modal.classList.add('active');
}

function selectVehicle(idx) {
  state.vehicle = VEHICLES[idx];
  alert(`Coche seleccionado: ${state.vehicle.brand} ${state.vehicle.model}`);
  closeGarage();
}

function closeGarage() { document.getElementById('garage-modal').classList.remove('active'); }

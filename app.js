// ============ CONFIGURACIÓN GLOBAL ============
const DEFAULT_CONFIG = {
  coefA: 2.0, coefB: 0.5, speedCorrectionK: 0.015, referenceSpeed: 80,
  minSpeed: 5, segmentLength: 100, dynamicIRI: true, calibrationWindow: 100,
  noiseFloor: 0.05
};

let config = {...DEFAULT_CONFIG};
let state = {
  isMeasuring: false, isPaused: false, watchId: null, lastPosition: null,
  totalDistance: 0, measurementStartTime: null, currentDataPoints: [],
  rawAccelBuffer: [], iriMeasuredAccum: 0, iriCorrectedAccum: 0, iriCount: 0,
  mapMeasure: null, mapMeasureActive: null, mapGlobal: null,
  measureRouteLine: null, measureActiveRouteLine: null,
  currentMarker: null, currentMarkerActive: null,
  sensorChart: null, sensorChartActive: null,
  chartDataZ: [], chartDataIRI: [], maxChartPoints: 60,
  activeVehicleId: null, dynamicBuffer: [], dynamicThresholds: null,
  orientationCalibrated: false, gravityUnit: null, gravityMagnitude: 9.8,
  gravityCalibrationSamples: [], calibrationStartTime: 0,
  useDeviceOrientationFallback: false, dynActivated: false,
  highSpeedStartTime: null, requiredHighSpeedTime: 5000,
  selectedRouteIds: new Set(), showAverage: false,
  sensorActive: false, mapExpanded: false,
  vibrationNoise: 0.05,
  calibrationPhase: 0,
  calibrationSamplesVib: [],
  lastIRIUpdate: 0                 // para throttling del display
};

// ============ BASE DE DATOS DE VEHÍCULOS (se mantiene igual) ============
const VEHICLE_DATABASE = [ /* ... */ ];

// ============ ESCALA DE COLORES (sin cambios) ============
function getIRIColor(iri) { /* ... */ }
function getAccelColor(val) { /* ... */ }

// ============ UTILIDADES ============
function calculateDistance(lat1,lon1,lat2,lon2) { /* ... */ }
function calculateRMS(buf) { /* ... */ }
function correctIRI(iri, spd) { /* ... */ }
function formatDate(ts) { /* ... */ }
function showToast(msg) { /* ... */ }

// ============ CARGA / GUARDADO ============
function loadConfig() { /* ... */ }
function saveConfig() { /* ... */ }
function getAllVehicles() { /* ... */ }
function saveCustomVehicles(arr) { /* ... */ }
function getCustomVehicles() { /* ... */ }
loadConfig();

// ============ ALMACENAMIENTO DE RUTAS ============
function saveRoute(r) { /* ... */ }
function getAllRoutes() { /* ... */ }
function deleteRouteById(id) { /* ... */ }
function clearAllRoutes() { /* ... */ }

function segmentizeRoute(points, len) { /* ... */ }

// ============ MEDICIÓN ============
function processAccelerometerData(verticalAccel) {
  const effectiveNoise = state.vibrationNoise || config.noiseFloor;
  if (Math.abs(verticalAccel) < effectiveNoise) verticalAccel = 0;

  state.rawAccelBuffer.push(verticalAccel);
  if(state.rawAccelBuffer.length>50) state.rawAccelBuffer.shift();
  const rms=calculateRMS(state.rawAccelBuffer);
  const iriMeasured = (rms < effectiveNoise) ? 0 : config.coefA * rms + config.coefB;
  const speed=state.lastPosition?.speed||0;
  const iriCorrected=correctIRI(iriMeasured, speed);

  // Actualizar display del IRI con throttling (cada 150ms)
  if (state.orientationCalibrated) {
    const now = Date.now();
    if (now - state.lastIRIUpdate > 150) {
      document.getElementById('iriMeasured').textContent = iriMeasured.toFixed(2);
      document.getElementById('iriCorrected').textContent = iriCorrected.toFixed(2);
      state.lastIRIUpdate = now;
    }
  }

  state.chartDataZ.push(verticalAccel); state.chartDataIRI.push(iriCorrected);
  if(state.chartDataZ.length>state.maxChartPoints){state.chartDataZ.shift(); state.chartDataIRI.shift();}
  updateCharts();
}

function updateCharts() { /* ... igual que antes ... */ }

// ============ GPS (con arranque rápido) ============
function updateGPSPosition(pos) {
  const {latitude,longitude,speed}=pos.coords;
  const kmh=speed?speed*3.6:0;
  const speedEl = document.getElementById('speedValue');
  if (speedEl) speedEl.textContent = (kmh > 3) ? kmh.toFixed(1) + ' km/h' : '0 km/h';

  // Si no hay posición anterior, es la primera lectura: centrar inmediatamente
  if (!state.lastPosition) {
    if(state.mapMeasure) {
      if (!state.currentMarker) {
        state.currentMarker = L.marker([latitude, longitude]).addTo(state.mapMeasure);
      } else {
        state.currentMarker.setLatLng([latitude, longitude]);
      }
      state.mapMeasure.setView([latitude, longitude], 17);
    }
    state.lastPosition = {lat: latitude, lon: longitude, speed: kmh};
    return;
  }

  // Movimiento real
  if (kmh > 3) {
    const dist = calculateDistance(state.lastPosition.lat, state.lastPosition.lon, latitude, longitude);
    if (dist > 1.5) {
      if(state.mapMeasure) {
        if (!state.currentMarker) {
          state.currentMarker = L.marker([latitude, longitude]).addTo(state.mapMeasure);
        } else {
          state.currentMarker.setLatLng([latitude, longitude]);
        }
        state.mapMeasure.panTo([latitude, longitude]);
      }
    }
  }

  state.lastPosition = {lat: latitude, lon: longitude, speed: kmh};
}

function startGPS() {
  if (state.watchId) return;
  if('geolocation' in navigator) {
    // Primero obtener posición rápidamente (baja precisión pero rápida)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateGPSPosition(pos);
        // Luego mantener watchPosition con alta precisión
        state.watchId = navigator.geolocation.watchPosition(updateGPSPosition,
          err => console.log('GPS error:', err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
      },
      (err) => {
        console.log('getCurrentPosition error, usando watch', err);
        // Si falla, iniciar watch directamente
        state.watchId = navigator.geolocation.watchPosition(updateGPSPosition,
          err => console.log('GPS error:', err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 30000 }
    );
  }
}

// ============ CALIBRACIÓN COMPLETA ============
function startOrientationCalibration() { /* ... igual ... */ }
function addCalibrationSample(x, y, z) { /* ... igual ... */ }
function finalizeCalibration() { /* ... igual ... */ }

// ============ SENSORES ============
function startAccelerometer() { /* ... igual ... */ }
function fallbackToDeviceMotion() { /* ... igual ... */ }
function handleDeviceOrientation(event) { /* ... igual ... */ }

// ============ CONTROL DE MEDICIÓN (pendiente de desarrollo) ============
function startMeasurement() {
  if (!state.activeVehicleId) { showToast('Selecciona un vehículo primero'); openGarage(); return; }
  showToast('Medición iniciada (funcionalidad en desarrollo)');
}

// ============ INTERFAZ GENERAL ============
function switchTab(tab) { /* ... igual ... */ }

// ============ GARAJE ============
function openGarage() { /* ... */ }
function closeGarage() { /* ... */ }
function loadGarage(){ /* ... */ }
function selectVehicle(id){ /* ... */ }
function showAddVehicleModal(){ /* ... */ }
function closeVehicleModal(){ /* ... */ }
function saveNewVehicle(){ /* ... */ }
function deleteCustomVehicle(id){ /* ... */ }

// ============ CORRECCIÓN VELOCIDAD ============
function openSpeedCorrection() { /* ... */ }
function closeSpeedCorrection() { /* ... */ }
function saveSpeedCorrection() { /* ... */ }

// ============ CALIBRAR ============
function calibratePhonePosition() {
  if (state.sensorActive) startOrientationCalibration();
  else showToast('Sensor no activo. Recarga la app.');
}

// ============ HISTORIAL ============
function loadHistory(){ /* ... */ }
function viewRouteDetail(id){ /* ... */ }
function deleteRoute(id){ /* ... */ }
function clearAllHistory(){ /* ... */ }
function exportRouteCSV(id){ /* ... */ }

// ============ MAPA GLOBAL (VISOR) ============
function loadGlobalMapTab(){ /* ... */ }
function handleRouteCheckbox(cb){ /* ... */ }
function toggleAllRoutes(selectAll){ /* ... */ }
function toggleAverageOverlaps(){ /* ... */ }
function refreshGlobalMap(){ /* ... */ }
function updateGlobalMap(){ /* ... */ }
function computeOverlappedSegments(routes,mode){ /* ... */ }
function haveOverlappingPoints(pts1,pts2,thr){ /* ... */ }
function showSegmentInfo(seg){ /* ... */ }

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded',()=>{
  loadConfig();

  // Mapa principal (vista por defecto hasta que el GPS nos ubique)
  state.mapMeasure = L.map('mapMeasure', { zoomControl: false, attributionControl: false }).setView([40.4168, -3.7038], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(state.mapMeasure);
  state.measureRouteLine = L.polyline([], { color: '#f59e0b', weight: 2, opacity: 0.5 }).addTo(state.mapMeasure);
  setTimeout(() => state.mapMeasure.invalidateSize(), 200);

  state.mapGlobal = L.map('mapGlobal', { zoomControl: true, attributionControl: false }).setView([40.4168, -3.7038], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(state.mapGlobal);

  const ctx = document.getElementById('sensorChart').getContext('2d');
  state.sensorChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Acel. Z', data: [], borderColor: '#3b82f6', yAxisID: 'y', tension: 0.4, pointRadius: 0,
        segment: { borderColor: ctx => getAccelColor(ctx.p1.raw || 0) } },
      { label: 'IRI Corr', data: [], borderColor: '#f59e0b', yAxisID: 'y1', tension: 0.4, pointRadius: 0,
        segment: { borderColor: ctx => getIRIColor(ctx.p1.raw || 0) } }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      scales: {
        x: { display: false },
        y: { type:'linear', display:true, position:'left', min:0, max:15, grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#94a3b8',font:{family:'JetBrains Mono',size:10}} },
        y1: { type:'linear', display:true, position:'right', min:0, max:10, grid:{drawOnChartArea:false}, ticks:{color:'#94a3b8',font:{family:'JetBrains Mono',size:10}} }
      }
    }
  });

  startGPS();
  startAccelerometer();
});
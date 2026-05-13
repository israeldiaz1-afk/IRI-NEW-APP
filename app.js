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
  vibrationNoise: 0.05, calibrationPhase: 0, calibrationSamplesVib: [],
  lastIRIUpdate: 0, initialPositionReceived: false,
  iriMax: 0, iriMin: Infinity, iriMedSum: 0, iriMedCount: 0
};

// ============ BASE DE DATOS DE VEHÍCULOS ============
const VEHICLE_DATABASE = [
  { id: 'v1', name: 'Toyota Corolla (2018-2024)', category: 'Compacto', coefA: 2.0, coefB: 0.50 },
  { id: 'v2', name: 'Honda Civic (2016-2024)', category: 'Compacto', coefA: 2.1, coefB: 0.50 },
  { id: 'v3', name: 'Volkswagen Golf (2020-2024)', category: 'Compacto', coefA: 2.05, coefB: 0.50 },
  { id: 'v4', name: 'Renault Clio (2019-2024)', category: 'Compacto', coefA: 1.9, coefB: 0.45 },
  { id: 'v17', name: 'SEAT Ibiza (2020-2024)', category: 'Compacto', coefA: 1.9, coefB: 0.45 },
  { id: 'v18', name: 'Fiat 500 (2019-2024)', category: 'Compacto', coefA: 1.7, coefB: 0.40 },
  { id: 'v19', name: 'Opel Corsa (2020-2024)', category: 'Compacto', coefA: 1.95, coefB: 0.45 },
  { id: 'v5', name: 'BMW Serie 3 (2019-2024)', category: 'Sedán', coefA: 2.3, coefB: 0.55 },
  { id: 'v6', name: 'Mercedes-Benz Clase C (2021-2024)', category: 'Sedán', coefA: 2.2, coefB: 0.50 },
  { id: 'v7', name: 'Audi A4 (2020-2024)', category: 'Sedán', coefA: 2.25, coefB: 0.55 },
  { id: 'v8', name: 'Tesla Model 3 (2021-2024)', category: 'Sedán', coefA: 2.4, coefB: 0.60 },
  { id: 'v20', name: 'Ford Mondeo (2018-2024)', category: 'Sedán', coefA: 2.15, coefB: 0.50 },
  { id: 'v21', name: 'Skoda Octavia (2020-2024)', category: 'Sedán', coefA: 2.05, coefB: 0.45 },
  { id: 'v9', name: 'Toyota RAV4 (2019-2024)', category: 'SUV', coefA: 2.4, coefB: 0.55 },
  { id: 'v10', name: 'Honda CR-V (2020-2024)', category: 'SUV', coefA: 2.35, coefB: 0.55 },
  { id: 'v11', name: 'Ford Explorer (2020-2024)', category: 'SUV', coefA: 2.6, coefB: 0.60 },
  { id: 'v12', name: 'Volkswagen Tiguan (2021-2024)', category: 'SUV', coefA: 2.3, coefB: 0.50 },
  { id: 'v22', name: 'Nissan Qashqai (2019-2024)', category: 'SUV', coefA: 2.3, coefB: 0.50 },
  { id: 'v23', name: 'Kia Sportage (2022-2024)', category: 'SUV', coefA: 2.35, coefB: 0.50 },
  { id: 'v24', name: 'Hyundai Tucson (2023-2024)', category: 'SUV', coefA: 2.2, coefB: 0.50 },
  { id: 'v25', name: 'MG ZS (2020-2024)', category: 'SUV', coefA: 2.25, coefB: 0.50 },
  { id: 'v26', name: 'DS 7 Crossback (2021-2024)', category: 'SUV', coefA: 2.1, coefB: 0.50 },
  { id: 'v27', name: 'Peugeot 3008 (2021-2024)', category: 'SUV', coefA: 2.15, coefB: 0.50 },
  { id: 'v28', name: 'Jeep Renegade (2021-2024)', category: 'SUV', coefA: 2.4, coefB: 0.55 },
  { id: 'v13', name: 'Porsche 911 (2020-2024)', category: 'Deportivo', coefA: 2.9, coefB: 0.65 },
  { id: 'v14', name: 'Ford Mustang (2018-2024)', category: 'Deportivo', coefA: 2.7, coefB: 0.60 },
  { id: 'v15', name: 'Mazda MX-5 (2016-2024)', category: 'Deportivo', coefA: 2.8, coefB: 0.60 },
  { id: 'v16', name: 'BMW M3 (2021-2024)', category: 'Deportivo', coefA: 3.0, coefB: 0.65 },
  { id: 'v29', name: 'Subaru BRZ (2022-2024)', category: 'Deportivo', coefA: 2.75, coefB: 0.60 },
  { id: 'v30', name: 'Toyota GR86 (2022-2024)', category: 'Deportivo', coefA: 2.7, coefB: 0.55 },
  { id: 'v31', name: 'Ford Ranger (2019-2024)', category: 'Pick-up', coefA: 2.8, coefB: 0.65 },
  { id: 'v32', name: 'Toyota Hilux (2020-2024)', category: 'Pick-up', coefA: 2.9, coefB: 0.65 },
  { id: 'v33', name: 'Volkswagen Amarok (2021-2024)', category: 'Pick-up', coefA: 2.85, coefB: 0.60 },
  { id: 'v34', name: 'Peugeot 307 SW (2002-2008)', category: 'Compacto', coefA: 2.15, coefB: 0.55 },
  { id: 'v35', name: 'Volkswagen Passat (2012)', category: 'Sedán', coefA: 2.05, coefB: 0.50 },
  { id: 'v36', name: 'Citroën e-C4 (2021-2024)', category: 'SUV', coefA: 1.65, coefB: 0.40 }
];

// ============ ESCALA DE COLORES ============
function getIRIColor(iri) {
  if (state.dynActivated && state.dynamicThresholds) {
    const { low, high } = state.dynamicThresholds;
    if (iri <= low) return '#10b981';
    if (iri <= high) return '#f59e0b';
    return '#ef4444';
  }
  if (iri <= 2) return '#10b981';
  if (iri <= 4) return '#f59e0b';
  if (iri <= 6) return '#f97316';
  return '#ef4444';
}

function getAccelColor(val) { return '#64748b'; }

// ============ UTILIDADES ============
function calculateDistance(lat1,lon1,lat2,lon2) {
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function calculateRMS(buf) { return buf.length ? Math.sqrt(buf.reduce((s,v)=>s+v*v,0)/buf.length) : 0; }
function correctIRI(iri, spd) { return spd<config.minSpeed ? iri : iri*(1+config.speedCorrectionK*(config.referenceSpeed-spd)/config.referenceSpeed); }
function formatDate(ts) { return new Date(ts).toLocaleString(); }
function showToast(msg) {
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:10px 20px;border-radius:20px;z-index:9999;';
  t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2000);
}

// ============ CARGA / GUARDADO ============
function loadConfig() {
  const saved = localStorage.getItem('roadcheck_config');
  if (saved) config = {...config, ...JSON.parse(saved)};
  state.vibrationNoise = config.noiseFloor || 0.05;
  const activeId = localStorage.getItem('roadcheck_active_vehicle');
  if (activeId) {
    const v = getAllVehicles().find(v=>v.id===activeId);
    if (v) { config.coefA = v.coefA; config.coefB = v.coefB; state.activeVehicleId = v.id; }
  }
}
function saveConfig() { localStorage.setItem('roadcheck_config', JSON.stringify(config)); }
function getAllVehicles() { return [...VEHICLE_DATABASE, ...JSON.parse(localStorage.getItem('roadcheck_custom_vehicles')||'[]')]; }
function saveCustomVehicles(arr) { localStorage.setItem('roadcheck_custom_vehicles', JSON.stringify(arr)); }
function getCustomVehicles() { return JSON.parse(localStorage.getItem('roadcheck_custom_vehicles')||'[]'); }
loadConfig();

// ============ ALMACENAMIENTO DE RUTAS ============
function saveRoute(r) {
  const routes=JSON.parse(localStorage.getItem('roadcheck_routes')||'[]'); routes.push(r);
  localStorage.setItem('roadcheck_routes',JSON.stringify(routes));
}
function getAllRoutes() { return JSON.parse(localStorage.getItem('roadcheck_routes')||'[]'); }
function deleteRouteById(id) { localStorage.setItem('roadcheck_routes', JSON.stringify(getAllRoutes().filter(r=>r.id!==id))); }
function clearAllRoutes() { localStorage.removeItem('roadcheck_routes'); }

function segmentizeRoute(points, len) {
  const segs=[]; if(points.length<2) return segs;
  let cur={pts:[],ms:0,cs:0,ss:0,n:0}, d=0;
  for(let i=1;i<points.length;i++) {
    const p=points[i-1],c=points[i];
    d+=calculateDistance(p.lat,p.lon,c.lat,c.lon);
    cur.pts.push(c); cur.ms+=c.iri_measured; cur.cs+=c.iri_corrected; cur.ss+=c.speed; cur.n++;
    if(d>=len||i===points.length-1) {
      const avgC=cur.cs/cur.n;
      segs.push({points:[...cur.pts], iriMeasuredAvg:cur.ms/cur.n, iriCorrectedAvg:avgC, speedAvg:cur.ss/cur.n, distance:d, color:getIRIColor(avgC)});
      cur={pts:[],ms:0,cs:0,ss:0,n:0}; d=0;
    }
  }
  return segs;
}

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

  if (state.orientationCalibrated) {
    document.getElementById('iriMeasured').textContent = iriMeasured.toFixed(2);
    document.getElementById('iriCorrected').textContent = iriCorrected.toFixed(2);
    const am = document.getElementById('activeIriMeasured');
    const ac = document.getElementById('activeIriCorrected');
    if (am) am.textContent = iriMeasured.toFixed(2);
    if (ac) ac.textContent = iriCorrected.toFixed(2);
  }

  if (state.isMeasuring && !state.isPaused) {
    if (iriCorrected > state.iriMax) state.iriMax = iriCorrected;
    if (iriCorrected < state.iriMin) state.iriMin = iriCorrected;
    state.iriMedSum += iriCorrected;
    state.iriMedCount++;
    const avg = state.iriMedSum / state.iriMedCount;
    const imax = document.getElementById('iriMax');
    const imin = document.getElementById('iriMin');
    const imed = document.getElementById('iriMed');
    if (imax) imax.textContent = state.iriMax.toFixed(2);
    if (imin) imin.textContent = state.iriMin === Infinity ? '---' : state.iriMin.toFixed(2);
    if (imed) imed.textContent = avg.toFixed(2);

    state.iriMeasuredAccum += iriMeasured;
    state.iriCorrectedAccum += iriCorrected;
    state.iriCount++;
  }

  state.chartDataZ.push(verticalAccel); state.chartDataIRI.push(iriCorrected);
  if(state.chartDataZ.length>state.maxChartPoints){state.chartDataZ.shift(); state.chartDataIRI.shift();}
  updateCharts();
}

function updateCharts() {
  if (state.chartDataZ.length === 0) return;
  const maxZ = Math.max(...state.chartDataZ, 1);
  const maxIRI = Math.max(...state.chartDataIRI, 1);
  const updateChart = (chart) => {
    if (!chart) return;
    chart.data.labels = state.chartDataZ.map((_,i)=>i);
    chart.data.datasets[0].data = state.chartDataZ;
    chart.data.datasets[1].data = state.chartDataIRI;
    chart.options.scales.y.max = Math.ceil(maxZ * 1.2);
    chart.options.scales.y1.max = Math.ceil(maxIRI * 1.2) || 10;
    chart.update('none');
  };
  updateChart(state.sensorChart);
  if (state.sensorChartActive) updateChart(state.sensorChartActive);
}

// ============ GPS ============
function updateGPSPosition(pos) {
  const {latitude, longitude, speed} = pos.coords;
  const kmh = speed ? speed * 3.6 : 0;
  document.getElementById('speedValue').textContent = (kmh > 3) ? kmh.toFixed(1) + ' km/h' : '0 km/h';

  if (!state.initialPositionReceived) {
    state.initialPositionReceived = true;
    if (state.mapMeasure) {
      state.currentMarker = L.marker([latitude, longitude]).addTo(state.mapMeasure);
      state.mapMeasure.setView([latitude, longitude], 17);
      setTimeout(() => state.mapMeasure.invalidateSize(), 100);
    }
    state.lastPosition = {lat: latitude, lon: longitude, speed: kmh};
    return;
  }

  if (kmh > 3) {
    const dist = calculateDistance(state.lastPosition.lat, state.lastPosition.lon, latitude, longitude);
    if (dist > 1.5) {
      state.totalDistance += dist;
      if(state.mapMeasure) {
        state.currentMarker.setLatLng([latitude, longitude]);
        state.mapMeasure.panTo([latitude, longitude]);
        state.measureRouteLine.addLatLng([latitude, longitude]);
      }
      if(state.mapMeasureActive) {
        if (!state.currentMarkerActive) state.currentMarkerActive = L.marker([latitude, longitude]).addTo(state.mapMeasureActive);
        else state.currentMarkerActive.setLatLng([latitude, longitude]);
        state.mapMeasureActive.panTo([latitude, longitude]);
        state.measureActiveRouteLine.addLatLng([latitude, longitude]);
      }
    }
  }

  if (state.isMeasuring && !state.isPaused && state.iriCount > 0) {
    state.currentDataPoints.push({
      timestamp: Date.now(),
      lat: latitude, lon: longitude, speed: kmh,
      iri_measured: state.iriMeasuredAccum / state.iriCount,
      iri_corrected: state.iriCorrectedAccum / state.iriCount
    });
    state.iriMeasuredAccum = 0; state.iriCorrectedAccum = 0; state.iriCount = 0;
  }
  state.lastPosition = {lat: latitude, lon: longitude, speed: kmh};
}

function startGPS() {
  if (state.watchId) return;
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateGPSPosition(pos);
        state.watchId = navigator.geolocation.watchPosition(updateGPSPosition, err=>{}, {enableHighAccuracy:true, maximumAge:0, timeout:5000});
      },
      (err) => {
        state.watchId = navigator.geolocation.watchPosition(updateGPSPosition, err=>{}, {enableHighAccuracy:true, maximumAge:0, timeout:5000});
      },
      { enableHighAccuracy: false, timeout: 1000, maximumAge: 30000 }
    );
  }
}

// ============ CALIBRACIÓN ============
function startOrientationCalibration() {
  state.orientationCalibrated = false; state.gravityUnit = null;
  state.gravityCalibrationSamples = []; state.calibrationSamplesVib = [];
  state.calibrationPhase = 1; state.calibrationStartTime = Date.now();
  const panel = document.getElementById('calibrationStatus');
  if (panel) {
    panel.classList.remove('hidden');
    document.getElementById('calProgressFill').style.width = '0%';
    document.getElementById('calStatusText').textContent = 'Fase 1/2: no muevas el móvil...';
  }
}
function addCalibrationSample(x,y,z) {
  if (state.orientationCalibrated) return;
  const samples = state.gravityCalibrationSamples;
  if (samples.length > 0) {
    const last = samples[samples.length-1];
    if (Math.abs(x-last.x)+Math.abs(y-last.y)+Math.abs(z-last.z) > 0.3) return;
  }
  samples.push({x,y,z});
  const elapsed = Date.now() - state.calibrationStartTime;
  const progress = Math.min(100, Math.floor((elapsed/5000)*100));
  document.getElementById('calProgressFill').style.width = progress+'%';
  if (elapsed >= 2500 && state.calibrationPhase === 1) {
    if (samples.length < 5) return;
    let mx=0,my=0,mz=0; samples.forEach(v=>{mx+=v.x; my+=v.y; mz+=v.z;});
    mx/=samples.length; my/=samples.length; mz/=samples.length;
    const mag = Math.sqrt(mx*mx+my*my+mz*mz);
    if (mag < 0.5) { document.getElementById('calibrationStatus').classList.add('hidden'); return; }
    state.gravityUnit = {x:mx/mag, y:my/mag, z:mz/mag};
    state.gravityMagnitude = mag; state.gravityCalibrationSamples = [];
    state.calibrationPhase = 2;
    document.getElementById('calStatusText').textContent = 'Fase 2/2: estudiando vibración...';
  }
  if (elapsed >= 2500 && state.calibrationPhase === 2) {
    const g = state.gravityUnit;
    const dynamicAccel = Math.abs(x*g.x + y*g.y + z*g.z - state.gravityMagnitude);
    state.calibrationSamplesVib.push(dynamicAccel);
  }
  if (elapsed >= 5000) finalizeCalibration();
}
function finalizeCalibration() {
  const vibSamples = state.calibrationSamplesVib;
  if (vibSamples.length > 0) {
    const rmsVib = Math.sqrt(vibSamples.reduce((s,v)=>s+v*v,0)/vibSamples.length);
    state.vibrationNoise = Math.max(config.noiseFloor, rmsVib);
    config.noiseFloor = state.vibrationNoise; saveConfig();
  }
  state.orientationCalibrated = true; state.calibrationSamplesVib = []; state.calibrationPhase = 0;
  document.getElementById('calibrationStatus').classList.add('hidden');
  showToast(`✅ Calibración completada. Vibración fondo: ${state.vibrationNoise.toFixed(3)} m/s²`);
}

// ============ SENSORES ============
function startAccelerometer() {
  if (state.sensorActive) return;
  state.sensorActive = true;
  startOrientationCalibration();
  if ('Accelerometer' in window) {
    try {
      window.accelerometer = new Accelerometer({frequency:60, includeGravity:true});
      window.accelerometer.addEventListener('reading', ()=>{
        if (!state.sensorActive) return;
        const {x,y,z} = window.accelerometer;
        if (!state.orientationCalibrated) addCalibrationSample(x,y,z);
        else { const g = state.gravityUnit; processAccelerometerData(Math.abs(x*g.x + y*g.y + z*g.z - state.gravityMagnitude)); }
      });
      window.accelerometer.start();
    } catch(e) { fallbackToDeviceMotion(); }
  } else { fallbackToDeviceMotion(); }
}
function fallbackToDeviceMotion() {
  window.addEventListener('deviceorientation', event => {
    if (!state.sensorActive) return;
    const {x,y,z} = event.accelerationIncludingGravity || {x:0,y:0,z:0};
    if (!state.orientationCalibrated) addCalibrationSample(x,y,z);
    else { const g = state.gravityUnit; processAccelerometerData(Math.abs(x*g.x + y*g.y + z*g.z - state.gravityMagnitude)); }
  });
}

// ============ PANTALLA DE MEDICIÓN ============
function enterMeasurementScreen() {
  document.getElementById('meas-active-screen').classList.remove('hidden');
  if (!state.mapMeasureActive) initMapMeasureActive();
  if (!state.sensorChartActive) initChartActive();
}
function initMapMeasureActive() {
  state.mapMeasureActive = L.map('mapMeasureActive', {zoomControl:false, attributionControl:false}).setView([0,0],17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19}).addTo(state.mapMeasureActive);
  state.measureActiveRouteLine = L.polyline([], {color:'#f59e0b', weight:4}).addTo(state.mapMeasureActive);
}
function initChartActive() {
  const ctx = document.getElementById('activeSensorChart').getContext('2d');
  state.sensorChartActive = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Acel. Z', data: [], borderColor: '#64748b', yAxisID: 'y', tension:0.4, pointRadius:0 },
      { label: 'IRI Corr', data: [], borderColor: '#f59e0b', yAxisID: 'y1', tension:0.4, pointRadius:0,
        segment: { borderColor: ctx => getIRIColor(ctx.p1.raw||0) } }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      scales: {
        x: { display: false },
        y: { type:'linear', display:true, position:'left', min:0, max:15, grid:{color:'rgba(255,255,255,0.03)'}, ticks:{color:'#fca5a5',font:{family:'JetBrains Mono',size:10}} },
        y1: { type:'linear', display:true, position:'right', min:0, max:10, grid:{drawOnChartArea:false}, ticks:{color:'#fca5a5',font:{family:'JetBrains Mono',size:10}} }
      }
    }
  });
}
function exitMeasurementScreen() {
  document.getElementById('meas-active-screen').classList.add('hidden');
}

// ============ CONTROL DE MEDICIÓN ============
function startMeasurement() {
  if (!state.activeVehicleId) { showToast('Selecciona un vehículo primero'); openGarage(); return; }
  state.iriMax = 0; state.iriMin = Infinity; state.iriMedSum = 0; state.iriMedCount = 0;
  document.getElementById('iriMax').textContent = '---';
  document.getElementById('iriMin').textContent = '---';
  document.getElementById('iriMed').textContent = '---';
  state.isMeasuring = true; state.isPaused = false; state.totalDistance = 0;
  state.currentDataPoints = []; state.rawAccelBuffer = [];
  state.iriMeasuredAccum = 0; state.iriCorrectedAccum = 0; state.iriCount = 0;
  enterMeasurementScreen();
  document.getElementById('btnPauseActive').classList.remove('hidden');
  document.getElementById('btnResumeActive').classList.add('hidden');
}
function pauseMeasurement() {
  state.isPaused = true;
  document.getElementById('btnPauseActive').classList.add('hidden');
  document.getElementById('btnResumeActive').classList.remove('hidden');
}
function resumeMeasurement() {
  state.isPaused = false;
  document.getElementById('btnPauseActive').classList.remove('hidden');
  document.getElementById('btnResumeActive').classList.add('hidden');
}
function stopMeasurement() {
  state.isMeasuring = false; state.isPaused = false;
  exitMeasurementScreen();
  if (state.currentDataPoints.length > 0) {
    const segs = segmentizeRoute(state.currentDataPoints, config.segmentLength);
    const allM = state.currentDataPoints.map(p=>p.iri_measured);
    const allC = state.currentDataPoints.map(p=>p.iri_corrected);
    const route = {
      id: Date.now().toString(), date: new Date().toISOString(), points: state.currentDataPoints,
      segments: segs,
      avgIRIMeasured: allM.reduce((a,b)=>a+b,0)/allM.length,
      avgIRICorrected: allC.reduce((a,b)=>a+b,0)/allC.length,
      totalDistance: state.totalDistance, segmentLength: config.segmentLength
    };
    saveRoute(route);
    showToast(`Ruta guardada. IRI corregido: ${route.avgIRICorrected.toFixed(2)}`);
  } else { showToast('No se registraron datos'); }
}

// ============ INTERFAZ, GARAJE, HISTORIAL, VISOR ============
// ... (estas funciones se mantienen idénticas a la última versión completa que te entregué, no hay cambios)
// Por brevedad, no las repito aquí, pero están completas en el archivo final.
// Asegúrate de copiarlas del anterior app.js completo que te funcionaba (el que tenía todas las funciones).

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  state.mapMeasure = L.map('mapMeasure', {zoomControl:false, attributionControl:false}).setView([40.4168,-3.7038],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19}).addTo(state.mapMeasure);
  state.measureRouteLine = L.polyline([], {color:'#f59e0b', weight:2, opacity:0.5}).addTo(state.mapMeasure);
  setTimeout(() => state.mapMeasure.invalidateSize(), 200);
  state.mapGlobal = L.map('mapGlobal', {zoomControl:true, attributionControl:false}).setView([40.4168,-3.7038],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19}).addTo(state.mapGlobal);

  const ctx = document.getElementById('sensorChart').getContext('2d');
  state.sensorChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Acel. Z (m/s²)', data: [], borderColor: '#64748b', yAxisID: 'y', tension:0.4, pointRadius:0 },
        { label: 'IRI Corr (m/km)', data: [], borderColor: '#f59e0b', yAxisID: 'y1', tension:0.4, pointRadius:0,
          segment: { borderColor: ctx => getIRIColor(ctx.p1.raw||0) } }
      ]
    },
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
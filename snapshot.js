
// snapshot.js
// Elamkulam Weather Snapshot (fully corrected)

const OPENWEATHER_KEY = "856b819166fedc7df9e65814b23e0970";
const LAT = 10.9081;
const LON = 76.2296;

// Safe number parse
function safeNum(v) {
  return (v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
}

// AQI Descriptor
function aqiDescriptor(aqi) {
  if (aqi === 1) return { text: "Good", color: "#2ecc71" };
  if (aqi === 2) return { text: "Fair", color: "#f1c40f" };
  if (aqi === 3) return { text: "Moderate", color: "#e67e22" };
  if (aqi === 4) return { text: "Poor", color: "#e74c3c" };
  if (aqi === 5) return { text: "Very Poor", color: "#8e44ad" };
  return { text: "Unknown", color: "#999" };
}

// Fetch OpenWeather Current
async function fetchOW() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}&units=metric`);
    if (!res.ok) throw new Error("OpenWeather failed");
    return await res.json();
  } catch (e) {
    console.warn("OW Error:", e.message);
    return null;
  }
}

// Fetch OpenWeather AQI
async function fetchOWAQI() {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}`);
    if (!res.ok) throw new Error("OW AQI failed");
    return await res.json();
  } catch (e) {
    console.warn("AQI Error:", e.message);
    return null;
  }
}

// Fetch Open-Meteo
async function fetchOM() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation,pressure_msl,visibility,windspeed_10m,cloudcover&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Open-Meteo failed");
    return await res.json();
  } catch (e) {
    console.warn("OM Error:", e.message);
    return null;
  }
}

// Get current hourly value from Open-Meteo
function findHourlyValue(omData, varName) {
  try {
    const times = omData.hourly.time;
    const values = omData.hourly[varName];
    if (!times || !values) return null;
    const now = new Date();
    const currentIso = now.toISOString().slice(0, 13);
    for (let i = 0; i < times.length; i++) {
      if (times[i].slice(0, 13) === currentIso) return safeNum(values[i]);
    }
    return safeNum(values[0]);
  } catch {
    return null;
  }
}

// Average helper
function combineAverage(a, b) {
  const A = safeNum(a);
  const B = safeNum(b);
  if (A === null && B === null) return null;
  if (A === null) return B;
  if (B === null) return A;
  return Number(((A + B) / 2).toFixed(1));
}

// Combine all data
function combineData(ow, om, aqiData) {
  const owTemp = ow?.main?.temp ?? null;
  const owFeels = ow?.main?.feels_like ?? null;
  const owHumidity = ow?.main?.humidity ?? null;
  const owWindKmh = ow?.wind?.speed ? Number((ow.wind.speed * 3.6).toFixed(1)) : null;
  const owPressure = ow?.main?.pressure ?? null;
  const owClouds = ow?.clouds?.all ?? null;
  const owRain1h = ow?.rain?.["1h"] ?? ow?.rain?.["3h"] ?? 0;
  const owVisibility = ow?.visibility ? ow.visibility / 1000 : null;

  const omTemp = om?.current_weather?.temperature ?? findHourlyValue(om, "temperature_2m");
  const omWind = findHourlyValue(om, "windspeed_10m") ?? om?.current_weather?.windspeed ?? null;
  const omHumidity = findHourlyValue(om, "relativehumidity_2m");
  const omPressure = findHourlyValue(om, "pressure_msl");
  const omClouds = findHourlyValue(om, "cloudcover");
  const omPrecip = findHourlyValue(om, "precipitation");
  const omVisibilityRaw = findHourlyValue(om, "visibility");
  const omVisibility = omVisibilityRaw !== null ? omVisibilityRaw / 1000 : null;

  const temp = combineAverage(owTemp, omTemp);
  const feels = combineAverage(owFeels, omTemp);
  const humidity = combineAverage(owHumidity, omHumidity);
  const wind = combineAverage(owWindKmh, omWind);
  const pressure = combineAverage(owPressure, omPressure);
  const clouds = combineAverage(owClouds, omClouds);
  const visibility = combineAverage(owVisibility, omVisibility);

  const rain = (() => {
    if (owRain1h === null && omPrecip === null) return 0;
    if (owRain1h === null) return omPrecip;
    if (omPrecip === null) return owRain1h;
    return Number(Math.max(owRain1h, omPrecip).toFixed(2));
  })();

  const aqi = aqiData?.list?.[0]?.main?.aqi ?? null;

  return { temp, feels, humidity, wind, visibility, pressure, clouds, rain, aqi };
}

// Update UI
function updateUI(final) {
  const map = {
    temp: "temp",
    feels: "feels",
    humidity: "humidity",
    wind: "wind",
    visibility: "visibility",
    pressure: "pressure",
    clouds: "clouds",
    rain: "rain"
  };
  for (let key in map) {
    const el = document.getElementById(map[key]);
    if (el) el.textContent = final[key] ?? "--";
  }

  const aqiEl = document.getElementById("aqi");
  const aqiDescEl = document.getElementById("aqi-desc");
  if (final.aqi !== null) {
    const d = aqiDescriptor(final.aqi);
    aqiEl.textContent = final.aqi;
    aqiDescEl.textContent = d.text;
    aqiDescEl.style.color = d.color;
  } else {
    aqiEl.textContent = "--";
    aqiDescEl.textContent = "--";
    aqiDescEl.style.color = "#777";
  }

  const updatedEl = document.getElementById("updated");
  if (updatedEl) updatedEl.textContent = new Date().toLocaleTimeString();
}

// Main loader
async function loadWeather() {
  const [ow, om, aqi] = await Promise.all([fetchOW(), fetchOM(), fetchOWAQI()]);
  if (!ow && !om) {
    updateUI({ temp: null, feels: null, humidity: null, wind: null, visibility: null, pressure: null, clouds: null, rain: null, aqi: null });
    return;
  }
  const final = combineData(ow, om, aqi);
  updateUI(final);
}

// Ensure DOM loaded
window.addEventListener("DOMContentLoaded", () => {
  loadWeather();
  setInterval(loadWeather, 120000); // refresh every 2 min
});


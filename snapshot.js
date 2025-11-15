// weather.js
// Uses OpenWeather (current + air_pollution) + Open-Meteo (hourly/current)
// Combines values with simple validation & averaging

const OPENWEATHER_KEY = "856b819166fedc7df9e65814b23e0970";
const LAT = 10.9081;
const LON = 76.2296;

// Helper: safe number parse
function safeNum(v) {
  return (v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
}

// Fetch OpenWeather current weather
async function fetchOpenWeather() {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OpenWeather failed");
  return await res.json();
}

// Fetch OpenWeather air pollution (AQI)
async function fetchOpenWeatherAQI() {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("OpenWeather AQI failed");
  return await res.json();
}

// Fetch Open-Meteo (request hourly vars and current_weather)
async function fetchOpenMeteo() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation,pressure_msl,visibility,windspeed_10m,cloudcover&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo failed");
  return await res.json();
}

// Find hourly value from Open-Meteo for the current hour
function findHourlyValue(omData, varName) {
  try {
    const times = omData.hourly.time; // array of ISO strings
    const values = omData.hourly[varName];
    if (!times || !values) return null;

    // current time in the same timezone as returned (we requested timezone=auto)
    const now = new Date();
    // Construct ISO-like string cutting minutes/seconds to hour to match OM times
    // OM returns times like "2025-11-15T10:00"
    const currentHourIso = now.toISOString().slice(0,13) + ":00";
    // But the timezone may differ; safer approach: find nearest time by looking for same date/hour ignoring timezone offset
    // We'll find the index where the hour matches current local hour string in the OM times.
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      // match year-month-dayThour:00
      if (t.slice(0,13) === currentHourIso.slice(0,13)) {
        return safeNum(values[i]);
      }
    }
    // fallback: use the first value (shouldn't normally happen)
    return safeNum(values[0]);
  } catch (e) {
    return null;
  }
}

// Average helper with null handling
function combineAverage(a, b) {
  const A = safeNum(a);
  const B = safeNum(b);
  if (A === null && B === null) return null;
  if (A === null) return Number(B.toFixed ? B.toFixed(1) : B);
  if (B === null) return Number(A.toFixed ? A.toFixed(1) : A);
  return Number(((A + B) / 2).toFixed(1));
}

// Map AQI numeric to descriptor & color
function aqiDescriptor(aqi) {
  // OpenWeather returns aqi 1..5 (1=Good, 5=Very Poor)
  if (aqi === 1) return { text: "Good", color: "#2ecc71" };
  if (aqi === 2) return { text: "Fair", color: "#f1c40f" };
  if (aqi === 3) return { text: "Moderate", color: "#e67e22" };
  if (aqi === 4) return { text: "Poor", color: "#e74c3c" };
  if (aqi === 5) return { text: "Very Poor", color: "#8e44ad" };
  return { text: "Unknown", color: "#999" };
}

// Combine data from both APIs
function combineData(ow, om, aqiData) {
  // OpenWeather fields (safe access)
  const owTemp = ow && ow.main ? safeNum(ow.main.temp) : null;
  const owFeels = ow && ow.main ? safeNum(ow.main.feels_like) : null;
  const owHumidity = ow && ow.main ? safeNum(ow.main.humidity) : null;
  const owWindMs = ow && ow.wind ? safeNum(ow.wind.speed) : null; // m/s
  const owVisibility = ow && ow.visibility ? safeNum(ow.visibility) / 1000 : null; // km
  const owPressure = ow && ow.main ? safeNum(ow.main.pressure) : null;
  const owClouds = ow && ow.clouds ? safeNum(ow.clouds.all) : null;
  const owRain1h = ow && ow.rain ? safeNum(ow.rain["1h"] || ow.rain["3h"] || 0) : 0;

  // Open-Meteo hourly/current values
  const omTemp = om && om.current_weather ? safeNum(om.current_weather.temperature) : findHourlyValue(om, 'temperature_2m');
  const omWindKmh = (findHourlyValue(om, 'windspeed_10m') !== null) ? safeNum(findHourlyValue(om, 'windspeed_10m')) : (om && om.current_weather ? safeNum(om.current_weather.windspeed) : null); // already km/h
  const omHumidity = findHourlyValue(om, 'relativehumidity_2m');
  const omVisibility = findHourlyValue(om, 'visibility'); // open-meteo visibility in km (if provided)
  const omPressure = findHourlyValue(om, 'pressure_msl');
  const omClouds = findHourlyValue(om, 'cloudcover');
  const omPrecip = findHourlyValue(om, 'precipitation');

  // Convert OW wind m/s -> km/h
  const owWindKmh = (owWindMs !== null) ? Number((owWindMs * 3.6).toFixed(1)) : null;

  // Combine / average
  const temp = combineAverage(owTemp, omTemp);
  const feels = combineAverage(owFeels, omTemp); // OM often doesn't give feels_like; we approximate with temp
  const humidity = combineAverage(owHumidity, omHumidity);
  const wind = combineAverage(owWindKmh, omWindKmh);
  const visibility = combineAverage(owVisibility, omVisibility); // km
  const pressure = combineAverage(owPressure, omPressure);
  const clouds = combineAverage(owClouds, omClouds);

  const rain = (() => {
    // prefer explicit OW rain 1h if meaningful, else OM precipitation
    const r1 = safeNum(owRain1h);
    const r2 = safeNum(omPrecip);
    if (r1 === null && r2 === null) return 0;
    if (r1 === null) return r2;
    if (r2 === null) return r1;
    // If they disagree widely, take the max (prefer higher precipitation)
    return Number(Math.max(r1, r2).toFixed(2));
  })();

  // AQI
  let aqi = null;
  if (aqiData && Array.isArray(aqiData.list) && aqiData.list[0] && aqiData.list[0].main) {
    aqi = safeNum(aqiData.list[0].main.aqi);
  }

  return {
    temp, feels, humidity, wind, visibility, pressure, clouds, rain, aqi
  };
}

// Update the DOM
function updateUI(final) {
  document.getElementById("temp").textContent = final.temp !== null ? final.temp : "--";
  document.getElementById("feels").textContent = final.feels !== null ? final.feels : "--";
  document.getElementById("humidity").textContent = final.humidity !== null ? final.humidity : "--";
  document.getElementById("wind").textContent = final.wind !== null ? final.wind : "--";
  document.getElementById("visibility").textContent = final.visibility !== null ? final.visibility : "--";
  document.getElementById("pressure").textContent = final.pressure !== null ? final.pressure : "--";
  document.getElementById("clouds").textContent = final.clouds !== null ? final.clouds : "--";
  document.getElementById("rain").textContent = final.rain !== null ? final.rain : "--";

  // AQI
  const aqiEl = document.getElementById("aqi");
  const aqiDescEl = document.getElementById("aqi-desc");
  if (final.aqi !== null) {
    const d = aqiDescriptor(final.aqi);
    aqiEl.textContent = final.aqi;
    aqiDescEl.textContent = d.text;
    // small color dot via background color on desc
    aqiDescEl.style.color = d.color;
  } else {
    aqiEl.textContent = "--";
    aqiDescEl.textContent = "--";
    aqiDescEl.style.color = "#777";
  }

  document.getElementById("updated").textContent = new Date().toLocaleTimeString();
}

// Main loader with error handling & fallbacks
async function loadWeather() {
  try {
    // Start both fetches in parallel
    const [owResp, omResp, aqiResp] = await Promise.allSettled([
      fetchOpenWeather(),
      fetchOpenMeteo(),
      fetchOpenWeatherAQI()
    ]);

    const ow = owResp.status === "fulfilled" ? owResp.value : null;
    const om = omResp.status === "fulfilled" ? omResp.value : null;
    const aqi = aqiResp.status === "fulfilled" ? aqiResp.value : null;

    // If both null -> show error and stop
    if (!ow && !om) {
      console.error("Both weather providers failed.");
      // set UI to blanks / error
      updateUI({ temp: null, feels: null, humidity: null, wind: null, visibility: null, pressure: null, clouds: null, rain: null, aqi: null });
      return;
    }

    const final = combineData(ow || {}, om || {}, aqi || {});
    updateUI(final);
  } catch (e) {
    console.error("Unexpected error in loadWeather:", e);
  }
}

// initial load and periodic refresh
loadWeather();
setInterval(loadWeather, 10 * 60 * 1000); // every 10 minutes

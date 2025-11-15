// snapshot.js
// Elamkulam Weather Snapshot - Open-Meteo Only

const LAT = 10.9081;
const LON = 76.2296;

// Helper: Safe number
function safeNum(v) {
    return v === null || v === undefined || isNaN(Number(v)) ? null : Number(v);
}

// Fetch Open-Meteo data
async function fetchOM() {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation,pressure_msl,visibility,windspeed_10m,cloudcover&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Open-Meteo request failed");
        return await res.json();
    } catch (e) {
        console.warn("Open-Meteo Error:", e.message);
        return null;
    }
}

// Find current hourly value
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

// Update UI
function updateUI(data) {
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
        if (el) el.textContent = data[key] !== null ? data[key] : "--";
    }

    // AQI not included in Open-Meteo; set placeholder
    const aqiEl = document.getElementById("aqi");
    const aqiDescEl = document.getElementById("aqi-desc");
    if (aqiEl && aqiDescEl) {
        aqiEl.textContent = "--";
        aqiDescEl.textContent = "N/A";
        aqiDescEl.style.color = "#777";
    }

    const updatedEl = document.getElementById("updated");
    if (updatedEl) updatedEl.textContent = new Date().toLocaleTimeString();
}

// Main loader
async function loadWeather() {
    const om = await fetchOM();
    if (!om) {
        updateUI({
            temp: null,
            feels: null,
            humidity: null,
            wind: null,
            visibility: null,
            pressure: null,
            clouds: null,
            rain: null
        });
        return;
    }

    const temp = findHourlyValue(om, "temperature_2m");
    const feels = temp; // Open-Meteo does not provide feels-like, use temp as fallback
    const humidity = findHourlyValue(om, "relativehumidity_2m");
    const wind = findHourlyValue(om, "windspeed_10m");
    const visibility = findHourlyValue(om, "visibility") !== null ? (findHourlyValue(om, "visibility") / 1000).toFixed(1) : null;
    const pressure = findHourlyValue(om, "pressure_msl");
    const clouds = findHourlyValue(om, "cloudcover");
    const rain = findHourlyValue(om, "precipitation");

    updateUI({ temp, feels, humidity, wind, visibility, pressure, clouds, rain });
}

// Ensure DOM loaded
window.addEventListener("DOMContentLoaded", () => {
    loadWeather();
    setInterval(loadWeather, 120000); // Refresh every 2 minutes
});

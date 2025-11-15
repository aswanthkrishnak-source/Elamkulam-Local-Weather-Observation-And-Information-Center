const ELAMKULAM_LAT_GENERAL = 10.9081;
const ELAMKULAM_LON_GENERAL = 76.2296;
const OPENWEATHER_API_KEY = "856b819166fedc7df9e65814b23e0970";

async function loadAQIBox() {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${ELAMKULAM_LAT_GENERAL}&lon=${ELAMKULAM_LON_GENERAL}&appid=${OPENWEATHER_API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        const aqi = data.list[0].main.aqi;

        const statusMap = {
            1: { text: "Good", class: "aqi-good" },
            2: { text: "Fair", class: "aqi-fair" },
            3: { text: "Moderate", class: "aqi-moderate" },
            4: { text: "Poor", class: "aqi-poor" },
            5: { text: "Very Poor", class: "aqi-very-poor" }
        };

        const aqiStatus = statusMap[aqi];

        const aqiDiv = document.getElementById("aqiValue");
        const aqiCircle = document.getElementById("aqiCircle");

        aqiDiv.textContent = `AQI ${aqi} — ${aqiStatus.text}`;
        aqiCircle.className = "aqi-circle " + aqiStatus.class;

    } catch (err) {
        console.error("AQI fetch error:", err);
        const aqiDiv = document.getElementById("aqiValue");
        const aqiCircle = document.getElementById("aqiCircle");
        aqiDiv.textContent = "AQI data unavailable.";
        aqiCircle.className = "aqi-circle aqi-poor";
    }
}

// Initial load + refresh every 10 minutes
loadAQIBox();
setInterval(loadAQIBox, 600000);

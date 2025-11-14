// === ELWOIC AUTOMATIC UPDATE SCRIPT ===

// Get the current date/time
const today = new Date();

/* ================================
   🌦️ MANUAL UPDATE SECTION
   Shows ONLY on the exact set date
================================= */
const manualDate = new Date("2025-11-08T18:30:00");
const manualMessage = "Currently light rain happens in Kerala.";
const manualNormal = "Check live weather updates on ELWOIC.";

const manualDiv = document.getElementById("weather-message");

if (today.toDateString() === manualDate.toDateString()) {
  manualDiv.innerText = manualMessage;
  manualDiv.style.color = "red";
  manualDiv.style.animation = "flash 1s infinite";

  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes flash {
      0%, 50%, 100% { opacity: 1; }
      25%, 75% { opacity: 0.2; }
    }
  `;
  document.head.appendChild(style);

} else {
  manualDiv.innerText = manualNormal;
  manualDiv.style.color = "#333";
  manualDiv.style.animation = "none";
}

/* ================================
   🌤️ PRE-UPDATE SECTION
   Shows until a specific date/time
================================= */
const preUpdateEnd = new Date("2025-10-29T23:59:59");
const preUpdateMessage =
  "29/10/2025: Heavy rainfall expected continues at 8 AM, 11 AM, 2 PM, 5 PM, 8 PM, and 11 PM. Take precautions. (Updated: 28/10/2025)";
const preUpdateNormal = "No new pre-updates available at the moment.";

const preDiv = document.getElementById("preupdate-message");

if (today < preUpdateEnd) {
  preDiv.innerText = preUpdateMessage;
  preDiv.style.color = "#cc9900";
} else {
  preDiv.innerText = preUpdateNormal;
  preDiv.style.color = "#999";
}

/* ================================
   💧 REGULAR INFORMATION SECTION
================================= */
const infoMessage = "............................";
document.getElementById("info-message").innerText = infoMessage;

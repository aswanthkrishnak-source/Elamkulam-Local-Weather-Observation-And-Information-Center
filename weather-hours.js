const API_KEY = "856b819166fedc7df9e65814b23e0970";
const LAT = 10.9081;
const LON = 76.2296;

async function getWeatherData() {
  const currentURL = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric`;
  const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentURL),
    fetch(forecastURL)
  ]);

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  // Forecast blocks
  const f3 = forecast.list[0];
  const f6 = forecast.list[1];
  const f9 = forecast.list[2];

  function rainVal(obj) {
    return obj.rain && obj.rain["3h"] ? obj.rain["3h"] + " mm" : "0 mm";
  }

  const rows = [
    ["Temperature (°C)",
      current.main.temp + "°C",
      f3.main.temp + "°C",
      f6.main.temp + "°C",
      f9.main.temp + "°C"
    ],
    ["Feels Like (°C)",
      current.main.feels_like + "°C",
      f3.main.feels_like + "°C",
      f6.main.feels_like + "°C",
      f9.main.feels_like + "°C"
    ],
    ["Humidity (%)",
      current.main.humidity + "%",
      f3.main.humidity + "%",
      f6.main.humidity + "%",
      f9.main.humidity + "%"
    ],
    ["Condition",
      current.weather[0].description,
      f3.weather[0].description,
      f6.weather[0].description,
      f9.weather[0].description
    ],
    ["Wind (km/h)",
      (current.wind.speed * 3.6).toFixed(1),
      (f3.wind.speed * 3.6).toFixed(1),
      (f6.wind.speed * 3.6).toFixed(1),
      (f9.wind.speed * 3.6).toFixed(1)
    ],
    ["Visibility (km)",
      (current.visibility / 1000).toFixed(1),
      (f3.visibility / 1000).toFixed(1),
      (f6.visibility / 1000).toFixed(1),
      (f9.visibility / 1000).toFixed(1)
    ],
    ["Rain (mm)",
      rainVal(current),
      rainVal(f3),
      rainVal(f6),
      rainVal(f9)
    ]
  ];

  let html = "";
  rows.forEach(row => {
    html += `
      <tr>
        <td><b>${row[0]}</b></td>
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td>${row[4]}</td>
      </tr>
    `;
  });

  document.getElementById("weatherRows").innerHTML = html;
}

getWeatherData();

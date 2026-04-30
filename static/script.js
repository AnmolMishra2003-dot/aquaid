// ================= ELEMENTS =================
const fileInput = document.getElementById("file-input");
const previewImg = document.getElementById("preview-img");
const previewState = document.getElementById("preview-state");
const uploadInner = document.getElementById("upload-inner");
const identifyBtn = document.getElementById("identify-btn");
const resultSection = document.getElementById("results-section");

const cameraBtn = document.getElementById("camera-btn");
const cameraContainer = document.getElementById("camera-container");
const video = document.getElementById("camera-feed");
const snapBtn = document.getElementById("snap-btn");
const closeCameraBtn = document.getElementById("close-camera-btn");
const canvas = document.getElementById("snap-canvas");

// ================= STATE =================
let selectedFile = null;
let lat = null;
let lon = null;
let stream = null;

// ================= FILE UPLOAD =================
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    selectedFile = file;

    previewImg.src = URL.createObjectURL(file);
    previewState.classList.remove("hidden");
    uploadInner.style.display = "none";

    identifyBtn.disabled = false;
});

// ================= REMOVE IMAGE =================
document.getElementById("remove-btn").addEventListener("click", () => {
    selectedFile = null;
    fileInput.value = "";

    previewState.classList.add("hidden");
    uploadInner.style.display = "block";

    identifyBtn.disabled = true;
});

// ================= LOCATION =================
document.getElementById("get-location-btn").addEventListener("click", () => {

    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            lat = position.coords.latitude;
            lon = position.coords.longitude;

            document.getElementById("lat-display").innerText = lat.toFixed(5);
            document.getElementById("lon-display").innerText = lon.toFixed(5);

            document.getElementById("loc-details").classList.remove("hidden");

            document.getElementById("location-status").innerHTML =
                `<p>📍 Location detected</p>`;
        },
        () => {
            alert("Location permission denied");
        }
    );
});

// ================= CAMERA =================
cameraBtn.addEventListener("click", async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        cameraContainer.classList.remove("hidden");
    } catch (err) {
        alert("Camera not supported or denied");
    }
});

snapBtn.addEventListener("click", () => {
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
        selectedFile = new File([blob], "camera.jpg", { type: "image/jpeg" });

        previewImg.src = URL.createObjectURL(selectedFile);
        previewState.classList.remove("hidden");
        uploadInner.style.display = "none";

        identifyBtn.disabled = false;

        stopCamera();
    });
});

closeCameraBtn.addEventListener("click", stopCamera);

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    cameraContainer.classList.add("hidden");
}

// ================= IDENTIFY =================
identifyBtn.addEventListener("click", async () => {

    if (!selectedFile) {
        alert("Upload image first");
        return;
    }

    const spinner = document.getElementById("spinner");
    const label = document.getElementById("identify-label");

    spinner.classList.remove("hidden");
    label.innerText = "Processing...";

    const formData = new FormData();
    formData.append("image", selectedFile);

    if (lat && lon) {
        formData.append("lat", lat);
        formData.append("lon", lon);
    }

    try {
        const res = await fetch("https://aquaid.onrender.com/predict", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        showResults(data);

    } catch (err) {
        alert("Server error");
    }

    spinner.classList.add("hidden");
    label.innerText = "🔍 Identify Fish";
});

// ================= SHOW RESULTS =================
function showResults(data) {

    resultSection.classList.remove("hidden");

    // ===== ONLY ONE PREDICTION =====
    document.getElementById("result-species").innerText =
        data.species || "Unknown";

    document.getElementById("conf-pct").innerText =
        data.confidence ? data.confidence + "%" : "";

    document.getElementById("conf-bar").style.width =
        data.confidence ? data.confidence + "%" : "0%";

    // ===== INFO TABLE =====
    const table = document.getElementById("info-table").querySelector("tbody");
    table.innerHTML = "";

    if (data.info) {
        for (let key in data.info) {
            table.innerHTML += `
                <tr>
                    <td>${key}</td>
                    <td>${data.info[key]}</td>
                </tr>
            `;
        }
    }

    // ===== LOCATION (FIXED SAFE) =====
    if (data.location) {
        document.getElementById("place-display").innerText =
            data.location.place || "Unknown";

        document.getElementById("lat-display").innerText =
            data.location.lat ? data.location.lat.toFixed(4) : "-";

        document.getElementById("lon-display").innerText =
            data.location.lon ? data.location.lon.toFixed(4) : "-";

        document.getElementById("loc-details").classList.remove("hidden");
    }

    // ===== WEATHER (FIXED) =====
    const weather = data.weather || {};

    const temp = weather.temperature;
    const wind = weather.windspeed;

    document.getElementById("weather-content").innerHTML = `
        <p>🌡 Temperature: ${temp !== null && temp !== undefined ? temp + "°C" : "N/A"}</p>
        <p>💨 Wind: ${wind !== null && wind !== undefined ? wind + " km/h" : "N/A"}</p>
    `;

    // ===== TOP PREDICTIONS FIX =====
    const topDiv = document.getElementById("top-preds");
    if (topDiv) {
        topDiv.innerHTML = "";

        if (data.top_predictions) {
            data.top_predictions.forEach(p => {
                topDiv.innerHTML += `
                    <p>${p.species} - ${p.confidence}%</p>
                `;
            });
        }
    }

    resultSection.scrollIntoView({ behavior: "smooth" });
}

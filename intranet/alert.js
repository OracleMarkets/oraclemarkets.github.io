document.addEventListener("DOMContentLoaded", () => {
    const attemptsApi = window.OracleIntranetAttempts;
    if (attemptsApi && !attemptsApi.isLockedOut()) {
        window.location.replace(attemptsApi.getIntranetHomeUrl());
        return;
    }

    const detectionEl = document.getElementById("alert-detection-time");
    const ipEl = document.getElementById("alert-ip");
    const locationEl = document.getElementById("alert-location");
    const codeEl = document.getElementById("alert-security-code");
    const mapGrid = document.getElementById("alert-map-grid");

    if (detectionEl) {
        detectionEl.textContent = formatUtcNow();
    }

    buildMapGrid(mapGrid);
    fetchGeoData(ipEl, locationEl, codeEl);
});

function formatUtcNow() {
    const now = new Date();
    const date = now.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    });
    const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "UTC"
    });
    return `${date} at ${time} UTC`;
}

function buildSecurityCode(ip) {
    const seed = ip || "unknown";
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const mid = String((hash % 90) + 10);
    return `SEC-${mid}-RISK`;
}

function buildMapGrid(container) {
    if (!container) return;

    const cells = 48;
    const activeIndex = Math.floor(Math.random() * cells);

    for (let i = 0; i < cells; i++) {
        const cell = document.createElement("span");
        cell.className = "intranet-alert-map-cell";
        if (i === activeIndex) cell.classList.add("is-active");
        container.appendChild(cell);
    }
}

async function fetchGeoData(ipEl, locationEl, codeEl) {
    try {
        const response = await fetch("https://ipapi.co/json/", {
            headers: { Accept: "application/json" }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const ip = data.ip || "Unknown";
        const city = data.city || "Unknown city";
        const region = data.region || data.region_code || "";
        const country = data.country_name || data.country || "Unknown";

        if (ipEl) ipEl.textContent = ip;

        if (locationEl) {
            locationEl.textContent = region ? `${city}, ${region}, ${country}` : `${city}, ${country}`;
        }

        if (codeEl) codeEl.textContent = buildSecurityCode(ip);
    } catch (_) {
        if (ipEl) ipEl.textContent = "Unavailable";
        if (locationEl) locationEl.textContent = "Unable to resolve location";
        if (codeEl) codeEl.textContent = buildSecurityCode("fallback");
    }
}

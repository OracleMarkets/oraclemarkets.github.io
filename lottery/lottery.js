const DISCORD_ICON = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

const WEBSITE_ICON = `<svg width="35" height="35" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M127.828 63.9141L63.9141 127.828L0 63.9141L63.9141 0L127.828 63.9141ZM15.5156 63.918L63.958 112.36L112.4 63.918L63.958 15.4756L15.5156 63.918ZM103.915 63.918L63.958 103.875L24.001 63.918L63.958 23.9609L103.915 63.918ZM54.7207 50.9062C52.6435 50.9062 50.642 51.2605 48.7168 51.9697C46.8168 52.6537 45.1314 53.6671 43.6621 55.0098C42.1675 56.3777 41.1286 57.9739 40.5459 59.7979C39.9633 61.6218 39.6719 63.4711 39.6719 65.3457C39.6719 67.0177 39.9132 68.652 40.3945 70.248C40.8758 71.8185 41.648 73.2373 42.7119 74.5039C43.8012 75.7705 45.2327 76.7712 47.0059 77.5059C48.8045 78.2405 51.0089 78.6074 53.6182 78.6074C55.6448 78.6074 57.5833 78.266 59.4326 77.582C61.3072 76.8727 63.0427 75.9603 64.6387 74.8457L63.8408 73.8955C62.5235 74.5288 61.1295 75.086 59.6602 75.5674C58.2163 76.0487 56.7219 76.29 55.1768 76.29C53.4034 76.29 51.8829 75.9222 50.6162 75.1875C49.3497 74.4529 48.3234 73.4904 47.5381 72.2998C46.7528 71.0838 46.17 69.779 45.79 68.3857C45.4354 66.9672 45.2588 65.5867 45.2588 64.2441C45.2588 63.0535 45.3981 61.786 45.6768 60.4434C45.9554 59.1009 46.4107 57.8341 47.0439 56.6436C47.6772 55.453 48.5388 54.4905 49.6279 53.7559C50.7173 52.9959 52.073 52.6162 53.6943 52.6162C55.113 52.6162 56.2912 52.9076 57.2285 53.4902C58.1657 54.0729 58.9134 54.8451 59.4707 55.8076C60.0534 56.7449 60.484 57.7584 60.7627 58.8477L61.3701 58.9619L64.9424 55.6934C63.8278 53.9457 62.4472 52.7171 60.8008 52.0078C59.1542 51.2732 57.1272 50.9063 54.7207 50.9062ZM66.0322 51.2861L65.8418 51.4756V52.4639C66.2724 52.4892 66.7414 52.5402 67.248 52.6162C67.7546 52.6922 68.2109 52.8561 68.6162 53.1094C69.0215 53.3374 69.2491 53.7052 69.2998 54.2119C69.3505 54.4905 69.376 54.9843 69.376 55.6934C69.4013 56.3773 69.4141 57.1377 69.4141 57.9736V60.2158C69.4141 63.1545 69.3758 66.1063 69.2998 69.0703C69.2238 72.0088 69.0972 74.9473 68.9199 77.8857L69.2617 78.2275L74.4678 76.3662L74.0498 65.5742C74.3279 65.5742 74.4929 65.599 74.5439 65.6494L84.0059 78.2275L84.8037 78.3037L89.25 76.3662L89.1357 75.7578C88.6291 75.3018 87.9962 74.668 87.2363 73.8574C86.5017 73.0468 85.6903 72.1353 84.8037 71.1221C83.9425 70.1088 83.0564 69.0825 82.1445 68.0439C81.2579 66.98 80.4092 65.9665 79.5986 65.0039L79.75 64.5859C80.7886 64.3073 81.7766 64.0031 82.7139 63.6738C83.6764 63.3192 84.5507 62.7873 85.3359 62.0781C86.0706 61.4195 86.5778 60.6337 86.8564 59.7217C87.135 58.7846 87.2744 57.86 87.2744 56.9482C87.2744 54.9976 86.4886 53.5663 84.918 52.6543C83.3727 51.7423 81.1437 51.2862 78.2305 51.2861H66.0322ZM76.1777 52.7676C77.7991 52.7676 79.1548 53.161 80.2441 53.9463C81.3333 54.7063 81.8779 55.9092 81.8779 57.5557C81.8779 58.4169 81.7258 59.2529 81.4219 60.0635C81.1432 60.8741 80.687 61.6089 80.0537 62.2676C79.6737 62.6475 79.1164 62.9772 78.3818 63.2559C77.6727 63.5091 76.913 63.6995 76.1025 63.8262C75.3172 63.9528 74.6325 64.0156 74.0498 64.0156V60.9756C74.0751 59.8103 74.0879 58.683 74.0879 57.5938C74.1132 56.4794 74.1387 55.5549 74.1641 54.8203C74.1894 54.0603 74.2021 53.6669 74.2021 53.6416C74.2529 53.1352 74.5061 52.8692 74.9619 52.8438C75.4177 52.7931 75.8232 52.7676 76.1777 52.7676Z"/></svg>`;

document.addEventListener("DOMContentLoaded", init);

function init() {
    initFooter();
    renderLottery();
}

function renderLottery() {
    const data = window.LOTTERY_DATA;
    const site = window.ORACLE_DATA?.site?.site;
    const potEl = document.getElementById("pot-value");
    const enterLink = document.getElementById("enter-link");
    const historyList = document.getElementById("history-list");
    const historyEmpty = document.getElementById("history-empty");

    if (!data) {
        if (potEl) potEl.textContent = "-";
        const historyTable = historyList?.closest(".lot-history-table");
        if (historyTable) historyTable.hidden = true;
        if (historyEmpty) historyEmpty.hidden = false;
        return;
    }

    if (potEl) {
        potEl.textContent = formatPot(data.pot ?? 0);
    }

    if (enterLink) {
        const url = data.entryUrl || site?.defaultBetUrl;
        if (url) {
            enterLink.href = url;
        } else {
            enterLink.hidden = true;
        }
    }

    if (!historyList) return;

    const history = Array.isArray(data.history) ? data.history : [];
    const historyTable = historyList.closest(".lot-history-table");

    if (!history.length) {
        if (historyTable) historyTable.hidden = true;
        historyEmpty.hidden = false;
        return;
    }

    if (historyTable) historyTable.hidden = false;
    historyEmpty.hidden = true;
    historyList.innerHTML = history
        .map(
            (draw) => `
            <div class="lot-history-row" role="row">
                <span class="lot-history-date" role="cell">${escapeHtml(draw.date)}</span>
                <span class="lot-history-pot" role="cell">${escapeHtml(formatPot(draw.pot ?? 0))}</span>
                <span class="lot-history-winner" role="cell">${escapeHtml(draw.winner ?? "-")}</span>
            </div>
        `
        )
        .join("");
}

function formatPot(amount) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${Number(amount).toLocaleString("en-US")}`;
}

function formatDrawDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function initFooter() {
    const site = window.ORACLE_DATA?.site;
    if (!site) return;

    const tagline = document.getElementById("footer-tagline");
    if (tagline) tagline.textContent = site.site?.tagline ?? "";

    renderFooterLinks(site.site);
}

function renderFooterLinks(site) {
    const container = document.getElementById("footer-links");
    if (!container || !site) return;

    const links = [];

    if (site.eventUrl) {
        links.push(`<a class="footer-link footer-link--web" href="${site.eventUrl}" target="_blank" rel="noopener noreferrer" aria-label="Event website">${WEBSITE_ICON}</a>`);
    }

    if (site.discordUrl) {
        links.push(`<a class="footer-link footer-link--discord" href="${site.discordUrl}" target="_blank" rel="noopener noreferrer" aria-label="Discord">${DISCORD_ICON}</a>`);
    }

    container.innerHTML = links.join("");
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

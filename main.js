const ARC_LENGTH = 126;
const STATIC_NAV_TABS = ["Trending", "New"];
const HIGHLIGHT_LIMIT = 3;
const HOURS_24_SEC = 86400;

let siteData = null;
let newsData = null;
let markets = [];
let featuredIndex = 0;
let featuredChart = null;
let activeNavTag = "Trending";
let activeGridTag = "All";
let searchQuery = "";
let chartJsPromise = null;

const dataPromise = loadAllData();
loadChartJs();

document.addEventListener("DOMContentLoaded", init);

function loadChartJs() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (!chartJsPromise) {
        chartJsPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js";
            script.async = true;
            script.onload = () => resolve(window.Chart);
            script.onerror = () => reject(new Error("Failed to load Chart.js"));
            document.head.appendChild(script);
        });
    }
    return chartJsPromise;
}

async function init() {
    let loaded;
    try {
        loaded = await dataPromise;
    } catch (err) {
        console.error(err);
        document.body.innerHTML = "<p style=\"padding:2rem;font-family:Inter,sans-serif\">Failed to load site data. Serve this site over HTTP so JSON files can be fetched.</p>";
        return;
    }
    siteData = loaded.site;
    newsData = loaded.news;
    markets = mergeMarkets(loaded.marketDefs, loaded.marketPools, siteData.site);

    activeNavTag = "Trending";

    renderNavTabs();
    renderSidebars();
    renderGridTags();
    renderMarkets();
    renderFeatured();

    bindGlobalEvents();
    document.getElementById("footer-tagline").textContent = siteData.site.tagline;
    renderFooterLinks();
}

const DISCORD_ICON = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;

const WEBSITE_ICON = `<svg width="35" height="35" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
<path d="M127.828 63.9141L63.9141 127.828L0 63.9141L63.9141 0L127.828 63.9141ZM15.5156 63.918L63.958 112.36L112.4 63.918L63.958 15.4756L15.5156 63.918ZM103.915 63.918L63.958 103.875L24.001 63.918L63.958 23.9609L103.915 63.918ZM54.7207 50.9062C52.6435 50.9062 50.642 51.2605 48.7168 51.9697C46.8168 52.6537 45.1314 53.6671 43.6621 55.0098C42.1675 56.3777 41.1286 57.9739 40.5459 59.7979C39.9633 61.6218 39.6719 63.4711 39.6719 65.3457C39.6719 67.0177 39.9132 68.652 40.3945 70.248C40.8758 71.8185 41.648 73.2373 42.7119 74.5039C43.8012 75.7705 45.2327 76.7712 47.0059 77.5059C48.8045 78.2405 51.0089 78.6074 53.6182 78.6074C55.6448 78.6074 57.5833 78.266 59.4326 77.582C61.3072 76.8727 63.0427 75.9603 64.6387 74.8457L63.8408 73.8955C62.5235 74.5288 61.1295 75.086 59.6602 75.5674C58.2163 76.0487 56.7219 76.29 55.1768 76.29C53.4034 76.29 51.8829 75.9222 50.6162 75.1875C49.3497 74.4529 48.3234 73.4904 47.5381 72.2998C46.7528 71.0838 46.17 69.779 45.79 68.3857C45.4354 66.9672 45.2588 65.5867 45.2588 64.2441C45.2588 63.0535 45.3981 61.786 45.6768 60.4434C45.9554 59.1009 46.4107 57.8341 47.0439 56.6436C47.6772 55.453 48.5388 54.4905 49.6279 53.7559C50.7173 52.9959 52.073 52.6162 53.6943 52.6162C55.113 52.6162 56.2912 52.9076 57.2285 53.4902C58.1657 54.0729 58.9134 54.8451 59.4707 55.8076C60.0534 56.7449 60.484 57.7584 60.7627 58.8477L61.3701 58.9619L64.9424 55.6934C63.8278 53.9457 62.4472 52.7171 60.8008 52.0078C59.1542 51.2732 57.1272 50.9063 54.7207 50.9062ZM66.0322 51.2861L65.8418 51.4756V52.4639C66.2724 52.4892 66.7414 52.5402 67.248 52.6162C67.7546 52.6922 68.2109 52.8561 68.6162 53.1094C69.0215 53.3374 69.2491 53.7052 69.2998 54.2119C69.3505 54.4905 69.376 54.9843 69.376 55.6934C69.4013 56.3773 69.4141 57.1377 69.4141 57.9736V60.2158C69.4141 63.1545 69.3758 66.1063 69.2998 69.0703C69.2238 72.0088 69.0972 74.9473 68.9199 77.8857L69.2617 78.2275L74.4678 76.3662L74.0498 65.5742C74.3279 65.5742 74.4929 65.599 74.5439 65.6494L84.0059 78.2275L84.8037 78.3037L89.25 76.3662L89.1357 75.7578C88.6291 75.3018 87.9962 74.668 87.2363 73.8574C86.5017 73.0468 85.6903 72.1353 84.8037 71.1221C83.9425 70.1088 83.0564 69.0825 82.1445 68.0439C81.2579 66.98 80.4092 65.9665 79.5986 65.0039L79.75 64.5859C80.7886 64.3073 81.7766 64.0031 82.7139 63.6738C83.6764 63.3192 84.5507 62.7873 85.3359 62.0781C86.0706 61.4195 86.5778 60.6337 86.8564 59.7217C87.135 58.7846 87.2744 57.86 87.2744 56.9482C87.2744 54.9976 86.4886 53.5663 84.918 52.6543C83.3727 51.7423 81.1437 51.2862 78.2305 51.2861H66.0322ZM76.1777 52.7676C77.7991 52.7676 79.1548 53.161 80.2441 53.9463C81.3333 54.7063 81.8779 55.9092 81.8779 57.5557C81.8779 58.4169 81.7258 59.2529 81.4219 60.0635C81.1432 60.8741 80.687 61.6089 80.0537 62.2676C79.6737 62.6475 79.1164 62.9772 78.3818 63.2559C77.6727 63.5091 76.913 63.6995 76.1025 63.8262C75.3172 63.9528 74.6325 64.0156 74.0498 64.0156V60.9756C74.0751 59.8103 74.0879 58.683 74.0879 57.5938C74.1132 56.4794 74.1387 55.5549 74.1641 54.8203C74.1894 54.0603 74.2021 53.6669 74.2021 53.6416C74.2529 53.1352 74.5061 52.8692 74.9619 52.8438C75.4177 52.7931 75.8232 52.7676 76.1777 52.7676Z"/>
</svg>`;

function renderFooterLinks() {
    const container = document.getElementById("footer-links");
    if (!container) return;

    const { discordUrl, eventUrl } = siteData.site;
    const links = [];

    if (eventUrl) {
        links.push(`<a class="footer-link footer-link--web" href="${eventUrl}" target="_blank" rel="noopener noreferrer" aria-label="Event website">${WEBSITE_ICON}</a>`);
    }

    if (discordUrl) {
        links.push(`<a class="footer-link footer-link--discord" href="${discordUrl}" target="_blank" rel="noopener noreferrer" aria-label="Discord">${DISCORD_ICON}</a>`);
    }

    container.innerHTML = links.join("");
}

async function fetchJson(path) {
    try {
        let res = await fetch(path);
        if (res.ok) return await res.json();
    } catch (_) { }
    return null;
}

async function loadAllData() {
    const [site, news, marketDefs, marketPools] = await Promise.all([
        fetchJson("data/data.json"),
        fetchJson("data/news.json"),
        fetchJson("data/markets.json"),
        fetchJson("data/market-pools.json")
    ]);

    if (!site || !news || !marketDefs || !marketPools) {
        throw new Error("Failed to load site data");
    }

    return { site, news, marketDefs, marketPools };
}

function mergeMarkets(marketDefs, marketPools, site) {
    const poolsById = Object.fromEntries(
        marketPools.pools.map((p) => [p.market_id, p])
    );

    return marketDefs.markets.map((def) => {
        const pool = poolsById[def.id];
        const poolSizes = pool
            ? Object.fromEntries(pool.outcomes.map((o) => [o.outcome, o.pool_size]))
            : {};

        const merged = {
            ...def,
            outcomes: def.outcomes.map((o) => ({
                ...o,
                pool_size: poolSizes[o.id] ?? 0
            })),
            history: pool?.history ?? []
        };

        return normaliseMarket(merged, site);
    });
}

function normaliseMarket(raw, site) {
    const totalPool = raw.outcomes.reduce((sum, o) => sum + o.pool_size, 0);
    const outcomes = raw.outcomes.map((o) => ({
        id: o.id,
        name: o.title,
        colour: o.colour,
        pool_size: o.pool_size,
        percent: totalPool ? Math.round((o.pool_size / totalPool) * 100) : 0,
        url: `${site.defaultBetUrl}`
    }));

    const yesOutcome = outcomes.find((o) => o.id === "yes");
    const noOutcome = outcomes.find((o) => o.id === "no");
    const isBinary = outcomes.length === 2 && yesOutcome && noOutcome;
    const history = buildChartHistory(raw);
    const leading = outcomes.reduce((a, b) => (a.percent > b.percent ? a : b));
    const primaryId = history.primaryId;
    const stats24h = compute24hStats(raw.history ?? [], totalPool, primaryId);

    return {
        id: raw.id,
        title: raw.title,
        short_title: raw.short_title,
        icon: raw.icon,
        tags: raw.tags,
        ends: formatEnds(raw.ends),
        type: isBinary ? "yes-no" : "multi",
        outcomes,
        yesPercent: yesOutcome?.percent ?? leading.percent,
        leadingOutcome: leading,
        betUrls: isBinary ? { yes: yesOutcome.url, no: noOutcome.url } : null,
        volume: formatVolume(totalPool),
        totalPool,
        subtitle: raw.tags.slice(0, 2).join(" • "),
        change: stats24h.change,
        volume24h: stats24h.volume24h,
        displayPercent: stats24h.displayPercent,
        history,
        addedAt: raw.added_at ?? 0
    };
}

function totalPoolFromSnapshot(poolSizes) {
    return poolSizes.reduce((sum, p) => sum + p.size, 0);
}

function percentForOutcome(poolSizes, outcomeId) {
    let total = totalPoolFromSnapshot(poolSizes);
    if (!total) return 0;
    let size = poolSizes.find((p) => p.outcome === outcomeId)?.size ?? 0;
    return Math.round((size / total) * 1000) / 10;
}

function getHistoryPoint24hAgo(history) {
    if (!history.length) return null;

    const sorted = [...history].sort((a, b) => a.date_time - b.date_time);
    const latest = sorted[sorted.length - 1];
    const target = latest.date_time - HOURS_24_SEC;

    let best = sorted[0];
    for (const point of sorted) {
        if (point.date_time <= target) best = point;
        else break;
    }
    return best;
}

function compute24hStats(history, currentTotal, primaryId) {
    const point24h = getHistoryPoint24hAgo(history);
    const latest = history.length ? [...history].sort((a, b) => a.date_time - b.date_time).at(-1) : null;

    const displayPercent = latest
        ? percentForOutcome(latest.pool_sizes, primaryId)
        : 0;

    if (!point24h || !latest) {
        return { volume24h: 0, change: 0, displayPercent };
    }

    const totalThen = totalPoolFromSnapshot(point24h.pool_sizes);
    const percentThen = percentForOutcome(point24h.pool_sizes, primaryId);
    const volume24h = Math.max(0, currentTotal - totalThen);
    const change = Math.round((displayPercent - percentThen) * 10) / 10;

    return { volume24h, change, displayPercent };
}

function buildChartHistory(raw) {
    const primaryId = raw.outcomes.find((o) => o.id === "yes")?.id
        ?? raw.outcomes.reduce((a, b) => (a.pool_size > b.pool_size ? a : b)).id;

    const labels = raw.history.map((h) => formatChartDate(h.date_time));
    const values = raw.history.map((h) => {
        const total = h.pool_sizes.reduce((s, p) => s + p.size, 0);
        const primary = h.pool_sizes.find((p) => p.outcome === primaryId)?.size ?? 0;
        return total ? Math.round((primary / total) * 1000) / 10 : 0;
    });

    return { labels, values, primaryId };
}

function formatVolume(amount) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M Vol.`;
    if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K Vol.`;
    return `$${amount} Vol.`;
}

function formatVolumeToday(amount) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M today`;
    if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K today`;
    if (amount > 0) return `$${amount} today`;
    return "$0 today";
}

function formatEnds(iso) {
    if (!iso) return "";
    let d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatChartDate(ts) {
    let d = new Date(ts * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelativeTime(ts) {
    let diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function getNewspaper(id) {
    return newsData.newspapers.find((n) => n.id === id);
}

function isStaticNavTab(tag) {
    return STATIC_NAV_TABS.includes(tag);
}

function matchesNavFilter(market) {
    if (isStaticNavTab(activeNavTag)) return true;
    return market.tags.includes(activeNavTag);
}

function getFilteredMarkets() {
    return markets.filter((m) => {
        let matchesGrid = activeGridTag === "All" || m.tags.includes(activeGridTag);
        let marketInfo = (m.title +  "," + m.tags.join(",")).toLowerCase();
        let matchesSearch = !searchQuery || marketInfo.includes(searchQuery);
        return matchesNavFilter(m) && matchesGrid && matchesSearch;
    });
}

function sortByVolume(list) {
    return [...list].sort((a, b) => b.totalPool - a.totalPool);
}

function sortByNewest(list) {
    return [...list].sort((a, b) => b.addedAt - a.addedAt);
}

function getSortedMarkets() {
    const filtered = getFilteredMarkets();
    return activeNavTag === "New" ? sortByNewest(filtered) : sortByVolume(filtered);
}

function getHighlightMarkets() {
    const filtered = getFilteredMarkets();
    const overrides = siteData.highlightOverrides ?? [];

    const overrideMarkets = overrides
        .map((id) => filtered.find((m) => m.id === id))
        .filter(Boolean);

    const usedIds = new Set(overrideMarkets.map((m) => m.id));
    const remainder = sortByVolume(filtered.filter((m) => !usedIds.has(m.id)));

    return [...overrideMarkets, ...remainder].slice(0, HIGHLIGHT_LIMIT);
}

function getArticlesForMarket(marketId) {
    return newsData.articles
        .filter((a) => a.market_id === marketId)
        .sort((a, b) => b.date_time - a.date_time)
        .map((a) => {
            const paper = getNewspaper(a.author_id);
            return {
                headline: a.title,
                source: paper?.name ?? "News",
                sourceImage: paper?.image ?? "",
                sourceLetter: paper?.name?.charAt(0) ?? "N",
                time: formatRelativeTime(a.date_time),
                link: a.link
            };
        });
}

function getBreakingNews() {
    return [...markets]
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 3)
        .map((m, i) => ({
            rank: i + 1,
            title: m.title,
            percent: Math.round(m.displayPercent),
            change: Math.abs(m.change),
            direction: m.change >= 0 ? "up" : "down"
        }));
}

function getHotTopics() {
    const tagVolumes = {};

    for (const market of markets) {
        for (const tag of market.tags) {
            tagVolumes[tag] = (tagVolumes[tag] ?? 0) + market.volume24h;
        }
    }

    return Object.entries(tagVolumes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, volume]) => ({
            name,
            volume: formatVolumeToday(volume)
        }));
}

function newsSourceIcon(article) {
    if (article.sourceImage) {
        return `<div class="news-source-icon"><img src="${article.sourceImage}" alt=""></div>`;
    }
    return `<div class="news-source-icon">${article.sourceLetter}</div>`;
}

function newsItemHtml(article) {
    return `
        <div class="news-item">
            ${newsSourceIcon(article)}
            <div class="news-headline">${article.headline}</div>
            <div class="news-time">${article.time}</div>
        </div>`;
}

function buildNewsFeedHtml(articles) {
    if (!articles.length) {
        return `<div class="news-feed"><div class="news-item"><div class="news-headline news-empty">No related articles</div></div></div>`;
    }

    if (articles.length === 1) {
        return `<div class="news-feed">${newsItemHtml(articles[0])}</div>`;
    }

    const items = articles.map(newsItemHtml).join("");
    const duration = Math.max(articles.length * 4, 12);

    return `
        <div class="news-feed news-feed--ticker">
            <div class="news-ticker-viewport">
                <div class="news-ticker-track" style="--ticker-duration:${duration}s">
                    ${items}
                    ${items}
                </div>
            </div>
        </div>`;
}

function bindGlobalEvents() {
    document.getElementById("search-bar").addEventListener("input", (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        featuredIndex = 0;
        renderFeatured();
        renderSidebars();
        renderMarkets();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement !== document.getElementById("search-bar")) {
            e.preventDefault();
            document.getElementById("search-bar").focus();
        }
    });
}

function renderNavTabs() {
    const container = document.getElementById("tabs");
    const trendingIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="m136-240-56-56 296-298 160 160 208-206H640v-80h240v240h-80v-104L536-320 376-480 136-240Z"/></svg>`;

    const staticTabs = STATIC_NAV_TABS.map((tag) => {
        const active = tag === activeNavTag ? " active" : "";
        const icon = tag === "Trending" ? trendingIcon : "";
        return `<button class="tab${active}" data-nav-tag="${tag}" type="button">${icon}${tag}</button>`;
    }).join("");

    const dynamicTabs = siteData.navTags.map((tag) => {
        const active = tag === activeNavTag ? " active" : "";
        return `<button class="tab${active}" data-nav-tag="${tag}" type="button">${tag}</button>`;
    }).join("");

    container.innerHTML = staticTabs + dynamicTabs;

    container.querySelectorAll("[data-nav-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
            activeNavTag = btn.dataset.navTag;
            featuredIndex = 0;
            renderNavTabs();
            renderFeatured();
            renderSidebars();
            renderMarkets();
        });
    });
}

function renderFeatured() {
    const list = getHighlightMarkets();
    const card = document.getElementById("featured-card");

    if (!list.length) {
        let emptyMessage = searchQuery.length ?`No ${activeNavTag} markets for "${searchQuery}".` : `No ${activeNavTag} markets.`;

        card.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        if (featuredChart) { featuredChart.destroy(); featuredChart = null; }
        return;
    }

    if (featuredIndex >= list.length) featuredIndex = 0;
    const market = list[featuredIndex];
    const articles = getArticlesForMarket(market.id);
    const carouselHtml = buildCarouselHtml(list, featuredIndex);

    const featuredIcon = market.icon
        ? `<div class="featured-icon"><img src="${market.icon}" alt=""></div>`
        : `<div class="featured-icon">${initials(market.title)}</div>`;

    const chanceText = market.type === "yes-no"
        ? `${market.yesPercent}% chance`
        : `${market.leadingOutcome.percent}% ${market.leadingOutcome.name}`;

    const actionButtons = market.type === "yes-no"
        ? `<div class="btn-row">
                <button class="btn-yes" data-bet-url="${market.betUrls.yes}" type="button">Yes</button>
                <button class="btn-no" data-bet-url="${market.betUrls.no}" type="button">No</button>
           </div>`
        : `<div class="outcomes-list featured-outcomes">
                ${market.outcomes.map((o) => `
                    <div class="outcome-row">
                        <p class="outcome-name">${o.name}</p>
                        <span class="outcome-pct lead">${o.percent}%</span>
                        <button class="btn-bet" data-bet-url="${o.url}" type="button">Bet</button>
                    </div>
                `).join("")}
           </div>`;

    card.innerHTML = `
        <div class="featured-header">
            ${featuredIcon}
            <div class="featured-title-block">
                <div class="featured-subtitle">${market.subtitle}</div>
                <h2>${market.title}</h2>
            </div>
           <!-- TODO: Add market links and bookmarks -->
<!--            <div class="featured-actions">-->
<!--                <button class="icon-btn" type="button" aria-label="Copy link">-->
<!--                    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>-->
<!--                </button>-->
<!--                <button class="icon-btn bookmark-btn" type="button" aria-label="Bookmark">-->
<!--                    <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>-->
<!--                </button>-->
<!--            </div>-->
        </div>

        <div class="highlight-body">
            <div class="highlight-left">
                <div class="chance-row">
                    <div class="chance">${chanceText}</div>
                    <div class="change ${market.change >= 0 ? "up" : "down"}">
                        ${market.change >= 0 ? "▲" : "▼"} ${Math.abs(market.change)}%
                    </div>
                </div>
                ${actionButtons}
                ${buildNewsFeedHtml(articles)}
            </div>
            <div class="graph-container">
                <canvas id="marketChart"></canvas>
            </div>
        </div>

        <div class="featured-footer">
            <span>${market.volume}${market.ends ? ` · Ends ${market.ends}` : ""}</span>
            ${carouselHtml}
        </div>
    `;

    card.querySelectorAll("[data-bet-url]").forEach((btn) => {
        btn.addEventListener("click", () => redirectBet(btn.dataset.betUrl));
    });

    card.querySelectorAll("[data-featured-idx]").forEach((dot) => {
        dot.addEventListener("click", () => {
            featuredIndex = Number(dot.dataset.featuredIdx);
            renderFeatured();
        });
    });

    card.querySelector("[data-carousel=prev]")?.addEventListener("click", () => {
        featuredIndex = (featuredIndex - 1 + list.length) % list.length;
        renderFeatured();
    });

    card.querySelector("[data-carousel=next]")?.addEventListener("click", () => {
        featuredIndex = (featuredIndex + 1) % list.length;
        renderFeatured();
    });

    renderFeaturedChart(market);
}

function getChartYScale(values) {
    let dataMax = Math.max(...values, 1);
    let step = dataMax > 35 ? 10 : 5;
    let yMax = Math.ceil(dataMax / step) * step;

    if (yMax <= dataMax) yMax += step;

    return { min: 0, max: yMax, step };
}

function sparseLabelIndices(count) {
    if (count <= 3) return Array.from({ length: count }, (_, i) => i);
    const mid = Math.floor((count - 1) / 2);
    return [0, mid, count - 1];
}

async function renderFeaturedChart(market) {
    const canvas = document.getElementById("marketChart");
    if (!canvas || !market.history.values.length) return;

    const Chart = await loadChartJs();
    const ctx = canvas.getContext("2d");
    const values = market.history.values;
    const labels = market.history.labels;
    const lastIndex = values.length - 1;
    const { min, max, step } = getChartYScale(values);
    const visibleLabelIndices = new Set(sparseLabelIndices(labels.length));

    if (featuredChart) featuredChart.destroy();

    featuredChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                data: values,
                borderColor: "#3b82f6",
                borderWidth: 2,
                tension: 0.38,
                capBezierPoints: true,
                pointRadius: values.map((_, i) => (i === lastIndex ? 4 : 0)),
                pointHoverRadius: values.map((_, i) => (i === lastIndex ? 5 : 0)),
                pointBackgroundColor: "#3b82f6",
                pointBorderColor: "#e6edf3",
                pointBorderWidth: 2,
                pointHitRadius: 12,
                fill: true,
                backgroundColor: (context) => {
                    const { ctx: c, chartArea } = context.chart;
                    if (!chartArea) return null;
                    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    g.addColorStop(0, "rgba(59,130,246,0.18)");
                    g.addColorStop(0.65, "rgba(59,130,246,0.04)");
                    g.addColorStop(1, "rgba(59,130,246,0)");
                    return g;
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 6, right: 2, bottom: 2, left: 0 } },
            animation: { duration: 600, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: "index",
                    intersect: false,
                    backgroundColor: "#1a1f26",
                    borderColor: "#2a3139",
                    borderWidth: 1,
                    cornerRadius: 6,
                    padding: 10,
                    titleColor: "#9ca3af",
                    titleFont: { size: 11, weight: "500" },
                    bodyColor: "#e6edf3",
                    bodyFont: { size: 12, weight: "600" },
                    displayColors: false,
                    callbacks: {
                        title: (items) => items[0]?.label ?? "",
                        label: (c) => `${c.raw}%`
                    }
                }
            },
            interaction: { mode: "index", intersect: false },
            scales: {
                x: {
                    border: { display: false },
                    grid: { display: false },
                    ticks: {
                        color: "#6b7280",
                        font: { size: 10, weight: "500" },
                        maxRotation: 0,
                        autoSkip: false,
                        callback: (_, index) => (
                            visibleLabelIndices.has(index) ? labels[index] : ""
                        )
                    }
                },
                y: {
                    min,
                    max,
                    position: "right",
                    border: { display: false },
                    grid: {
                        color: "rgba(255,255,255,0.05)",
                        drawBorder: false,
                        tickLength: 0
                    },
                    ticks: {
                        stepSize: step,
                        color: "#6b7280",
                        font: { size: 10, weight: "500" },
                        padding: 6,
                        callback: (value) => (
                            Number.isInteger(value) ? `${value}%` : ""
                        )
                    }
                }
            }
        }
    });
}

function renderSidebars() {
    const container = document.getElementById("sidebars");
    const breakingNews = getBreakingNews();
    const hotTopics = getHotTopics();

    container.innerHTML = `
        <div class="sidebar-card">
            <h3>Breaking news</h3>
            ${breakingNews.map((item) => `
                <div class="breaking-item">
                    <span class="breaking-rank">${item.rank}</span>
                    <span class="breaking-title">${item.title}</span>
                    <span class="breaking-stat">
                        <span class="pct">${item.percent}%</span>
                        <span class="trend ${item.direction}">${item.direction === "up" ? "↗" : "↘"} ${item.change}%</span>
                    </span>
                </div>
            `).join("")}
        </div>
        <div class="sidebar-card">
            <h3>Hot topics</h3>
            ${hotTopics.map((topic, i) => `
                <div class="hot-topic">
                    <span class="hot-topic-name">
                        <span class="hot-topic-rank">${i + 1}</span>
                        ${topic.name}
                    </span>
                    <span class="hot-topic-vol">${topic.volume}</span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderGridTags() {
    const container = document.getElementById("grid-tags");

    container.innerHTML = siteData.gridTags.map((tag) => {
        const active = tag === activeGridTag ? " active" : "";
        return `<button class="grid-tag${active}" data-grid-tag="${tag}" type="button">${tag}</button>`;
    }).join("");

    container.querySelectorAll("[data-grid-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
            activeGridTag = btn.dataset.gridTag;
            featuredIndex = 0;
            renderGridTags();
            renderFeatured();
            renderSidebars();
            renderMarkets();
        });
    });
}

function renderMarkets() {
    let grid = document.getElementById("event-grid");
    let empty = document.getElementById("empty-state");
    let filtered = getSortedMarkets();

    if (!filtered.length) {
        grid.innerHTML = "";
        empty.hidden = false;
        return;
    }

    empty.hidden = true;
    grid.innerHTML = filtered.map((m, i) => renderMarketCard(m, i)).join("");

    grid.querySelectorAll("[data-bet-url]").forEach((btn) => {
        btn.addEventListener("click", () => redirectBet(btn.dataset.betUrl));
    });

    grid.querySelectorAll(".arc-fill").forEach((arc) => {
        animateArc(arc, Number(arc.dataset.percent));
    });
}

function marketIconHtml(market) {
    if (market.icon) {
        return `<div class="market-icon"><img src="${market.icon}" alt=""></div>`;
    }
    return `<div class="market-icon">${initials(market.title)}</div>`;
}

function renderMarketCard(market, index) {
    const delay = Math.min(index * 0.04, 0.4);

    if (market.type === "multi") {
        const maxPct = Math.max(...market.outcomes.map((o) => o.percent));
        return `
            <article class="event-card fade-in" style="animation-delay:${delay}s">
                <div class="event-card-top">
                    <div class="event-card-header">
                        ${marketIconHtml(market)}
                        <h3 class="event-card-title">${market.title}</h3>
                    </div>
                </div>
                <div class="outcomes-list">
                    ${market.outcomes.map((o) => `
                        <div class="outcome-row">
                            <p class="outcome-name">${o.name}</p>
                            <span class="outcome-pct ${o.percent === maxPct ? "lead" : "trail"}">${o.percent}%</span>
                            <button class="btn-bet" data-bet-url="${o.url}" type="button">Bet</button>
                        </div>
                    `).join("")}
                </div>
                <div class="card-meta">
                    <span>${market.volume}</span>
                    <button class="bookmark-btn" type="button" aria-label="Bookmark">
                        <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                    </button>
                </div>
            </article>
        `;
    }

    return `
        <article class="event-card fade-in" style="animation-delay:${delay}s">
            <div class="event-card-top">
                <div class="event-card-header">
                    ${marketIconHtml(market)}
                    <h3 class="event-card-title">${market.title}</h3>
                </div>
                <div class="chance-arc">
                    <svg viewBox="0 0 100 50" aria-hidden="true">
                        <path d="M10 50 A40 40 0 0 1 90 50" class="arc-bg"/>
                        <path d="M10 50 A40 40 0 0 1 90 50" class="arc-fill" data-percent="${market.yesPercent}"/>
                    </svg>
                    <div class="arc-label">
                        <span class="percent">${market.yesPercent}%</span>
                        <span class="sub">Chance</span>
                    </div>
                </div>
            </div>
            <div class="btn-row btn-row--compact">
                <button class="btn-yes" data-bet-url="${market.betUrls.yes}" type="button">Yes</button>
                <button class="btn-no" data-bet-url="${market.betUrls.no}" type="button">No</button>
            </div>
            <div class="card-meta">
                <span>${market.volume}</span>
                <button class="bookmark-btn" type="button" aria-label="Bookmark">
                    <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                </button>
            </div>
        </article>
    `;
}

function animateArc(arc, percent) {
    const offset = ARC_LENGTH * (1 - percent / 100);
    requestAnimationFrame(() => {
        arc.style.stroke = "#3b82f6";
        arc.style.strokeDashoffset = String(offset);
    });
}

function initials(title) {
    const words = title.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return (words[0]?.[0] || "?").toUpperCase();
}

function carouselLabel(market) {
    return market.short_title || market.title;
}

function buildCarouselHtml(list, index) {
    let count = list.length;
    if (count <= 1) return "";

    let dots = `<div class="carousel-dots">
        ${list.map((_, i) => `<button class="carousel-dot${i === index ? " active" : ""}" data-featured-idx="${i}" type="button" aria-label="Market ${i + 1}"></button>`).join("")}
    </div>`;

    let nextMarket = list[(index + 1) % count];
    let nextBtn = `<button class="carousel-btn" data-carousel="next" type="button">${truncateTitle(carouselLabel(nextMarket))} ›</button>`;

    let nav = "";
    if (count === 2) {
        nav = `<div class="carousel-nav">${nextBtn}</div>`;
    } else if (count >= 3) {
        let prevMarket = list[(index - 1 + count) % count];
        let prevBtn = `<button class="carousel-btn" data-carousel="prev" type="button">‹ ${truncateTitle(carouselLabel(prevMarket))}</button>`;
        nav = `<div class="carousel-nav">${prevBtn}${nextBtn}</div>`;
    }

    return `${dots}${nav}`;
}

function truncateTitle(title, max = 18) {
    return title.length > max ? title.slice(0, max) + "…" : title;
}

function redirectBet(url) {
    window.open(url || siteData.site.defaultBetUrl, "_blank", "noopener,noreferrer");
}

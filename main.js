const ARC_LENGTH = 126;
const STATIC_NAV_TABS = ["Trending", "New", "Resolved"];
const EXPIRED_GRACE_MS = 30 * 60 * 1000;
const HIGHLIGHT_LIMIT = 3;
const HOURS_24_SEC = 86400;
const MARKET_END_TZ = "America/New_York";

const SKELETON_EVENT_CARD = `<article class="event-card skeleton-card"><div class="skeleton-card-top"><div class="skeleton-block skeleton-card-icon"></div><div class="skeleton-card-copy"><div class="skeleton-line skeleton-line--card-title"></div><div class="skeleton-line skeleton-line--card-title-sub"></div></div><div class="skeleton-block skeleton-card-arc"></div></div><div class="skeleton-btn-row"><div class="skeleton-block skeleton-btn skeleton-btn--compact"></div><div class="skeleton-block skeleton-btn skeleton-btn--compact"></div></div><div class="skeleton-line skeleton-line--card-meta"></div></article>`;

const SKELETON_FEATURED_HTML = `
        <div class="featured-header">
            <div class="skeleton-block skeleton-icon"></div>
            <div class="featured-title-block">
                <div class="skeleton-line skeleton-line--xs"></div>
                <div class="skeleton-line skeleton-line--lg"></div>
            </div>
        </div>
        <div class="highlight-body">
            <div class="highlight-left">
                <div class="skeleton-line skeleton-line--chance"></div>
                <div class="skeleton-btn-row">
                    <div class="skeleton-block skeleton-btn"></div>
                    <div class="skeleton-block skeleton-btn"></div>
                </div>
            </div>
            <div class="skeleton-block skeleton-chart"></div>
        </div>
        <div class="skeleton-featured-footer">
            <div class="skeleton-line skeleton-line--footer-meta"></div>
            <div class="skeleton-footer-dots">
                <span class="skeleton-dot"></span>
                <span class="skeleton-dot"></span>
                <span class="skeleton-dot"></span>
            </div>
            <div class="skeleton-line skeleton-line--footer-nav"></div>
        </div>`;

const SKELETON_GRID_TAGS_HTML = `
            <span class="skeleton-pill"></span>
            <span class="skeleton-pill"></span>
            <span class="skeleton-pill"></span>
            <span class="skeleton-pill"></span>
            <span class="skeleton-pill skeleton-pill--short"></span>`;

const SKELETON_SIDEBARS_HTML = `
            <div class="sidebar-card skeleton-sidebar">
                <div class="skeleton-line skeleton-line--sidebar-title"></div>
                <div class="skeleton-breaking-item">
                    <div class="skeleton-line skeleton-line--rank"></div>
                    <div class="skeleton-line skeleton-line--breaking-title"></div>
                    <div class="skeleton-breaking-stat">
                        <div class="skeleton-line skeleton-line--stat"></div>
                        <div class="skeleton-line skeleton-line--stat-sm"></div>
                    </div>
                </div>
                <div class="skeleton-breaking-item">
                    <div class="skeleton-line skeleton-line--rank"></div>
                    <div class="skeleton-line skeleton-line--breaking-title"></div>
                    <div class="skeleton-breaking-stat">
                        <div class="skeleton-line skeleton-line--stat"></div>
                        <div class="skeleton-line skeleton-line--stat-sm"></div>
                    </div>
                </div>
                <div class="skeleton-breaking-item">
                    <div class="skeleton-line skeleton-line--rank"></div>
                    <div class="skeleton-line skeleton-line--breaking-title"></div>
                    <div class="skeleton-breaking-stat">
                        <div class="skeleton-line skeleton-line--stat"></div>
                        <div class="skeleton-line skeleton-line--stat-sm"></div>
                    </div>
                </div>
            </div>
            <div class="sidebar-card skeleton-sidebar">
                <div class="skeleton-line skeleton-line--sidebar-title"></div>
                <div class="skeleton-hot-item">
                    <div class="skeleton-line skeleton-line--hot-name"></div>
                    <div class="skeleton-line skeleton-line--hot-vol"></div>
                </div>
                <div class="skeleton-hot-item">
                    <div class="skeleton-line skeleton-line--hot-name"></div>
                    <div class="skeleton-line skeleton-line--hot-vol"></div>
                </div>
                <div class="skeleton-hot-item">
                    <div class="skeleton-line skeleton-line--hot-name"></div>
                    <div class="skeleton-line skeleton-line--hot-vol"></div>
                </div>
            </div>`;

let siteData = null;
let newsData = null;
let markets = [];
let featuredIndex = 0;
const featuredChartStore = { chart: null };
const modalChartStore = { chart: null };
let activeNavTag = "Trending";
let activeGridTag = "All";
let activeResolvedGridTag = "All";
let searchQuery = "";
let chartJsPromise = null;
let marketEndTimer = null;
let marketsReady = false;
let liveDataUnavailable = false;
let resolvedPoolsLoaded = false;
let resolvedPoolsLoading = null;

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
    const { site, news, marketDefs } = window.ORACLE_DATA ?? {};

    if (!site || !news || !marketDefs) {
        showFatalError("Failed to load site data.");
        return;
    }

    siteData = site;
    newsData = news;
    activeNavTag = "Trending";

    renderNavTabs();
    renderFooterLinks();
    document.getElementById("footer-tagline").textContent = siteData.site.tagline;

    try {
        const loaded = await dataPromise;
        markets = mergeMarkets(loaded.marketDefs, loaded.marketPools, siteData.site);
        marketsReady = true;
    } catch (err) {
        console.error(err);
        const { marketDefs } = window.ORACLE_DATA ?? {};
        markets = mergeMarkets(marketDefs, { pools: [] }, siteData.site);
        marketsReady = true;
        liveDataUnavailable = true;
    }

    finishMarketsRender();
    if (liveDataUnavailable) showLiveDataBanner();
}

function finishMarketsRender() {
    const main = document.getElementById("main-content");
    main?.setAttribute("aria-busy", "false");
    main?.classList.add("content-ready");

    document.getElementById("featured-card")?.removeAttribute("aria-hidden");
    document.getElementById("sidebars")?.removeAttribute("aria-hidden");
    document.getElementById("grid-tags")?.removeAttribute("aria-hidden");
    document.getElementById("event-grid")?.removeAttribute("aria-hidden");

    renderSidebars();
    renderGridTags();
    renderMarkets();
    renderFeatured();
    bindGlobalEvents();
    bindBetModal();
    bindMarketModal();
    startMarketEndTicker();
}

function showFatalError(message) {
    const main = document.getElementById("main-content");
    main?.setAttribute("aria-busy", "false");
    document.body.innerHTML = `<p style="padding:2rem;font-family:Inter,sans-serif;color:#e6edf3;background:#15191d;min-height:100vh">${message}</p>`;
}

function showLiveDataBanner(retryFailed = false) {
    const banner = document.getElementById("live-data-banner");
    const title = document.getElementById("live-data-banner-title");
    const desc = document.getElementById("live-data-banner-desc");
    if (!banner) return;

    if (title) {
        title.textContent = retryFailed
            ? "Still couldn't reach live market data"
            : "Live market data unavailable";
    }

    if (desc) {
        desc.textContent = retryFailed
            ? "Check your connection and try again. Markets below are shown without live pool sizes or odds."
            : "Pool sizes and odds couldn't be loaded. Markets are shown without live betting data.";
    }

    banner.hidden = false;
}

function hideLiveDataBanner() {
    const banner = document.getElementById("live-data-banner");
    if (banner) banner.hidden = true;
}

async function retryLoadPools() {
    const btn = document.getElementById("retry-pools-btn");
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    btn.textContent = "Retrying…";

    try {
        const status = activeNavTag === "Resolved" ? "resolved" : "active";
        const { marketDefs } = window.ORACLE_DATA ?? {};
        const marketPools = await fetchMarketPools(siteData.site.marketsApiUrl, status);

        if (status === "resolved") {
            applyMarketPoolUpdates(marketPools, siteData.site);
            resolvedPoolsLoaded = true;
        } else {
            markets = mergeMarkets(marketDefs, marketPools, siteData.site);
        }

        liveDataUnavailable = false;
        hideLiveDataBanner();
        renderSidebars();
        renderGridTags();
        renderMarkets();
        renderFeatured();
    } catch (err) {
        console.error(err);
        showLiveDataBanner(true);
    } finally {
        btn.disabled = false;
        btn.textContent = "Try again";
    }
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

function loadAllData() {
    const { site, news, marketDefs } = window.ORACLE_DATA ?? {};

    if (!site || !news || !marketDefs) {
        return Promise.reject(new Error("Failed to load site data"));
    }

    return (window.__ORACLE_MARKETS_POOLS_PROMISE__ ?? fetchMarketPools(site.site.marketsApiUrl, "active")).then((marketPools) => ({
        site,
        news,
        marketDefs,
        marketPools
    }));
}

function marketsApiUrl(apiUrl, status) {
    const url = new URL(apiUrl || "https://oracle-markets-backend.vercel.app/api/markets");
    url.searchParams.set("status", status);
    return url.href;
}

async function fetchMarketPools(apiUrl, status = "active") {
    const response = await fetch(marketsApiUrl(apiUrl, status));

    if (!response.ok) {
        throw new Error(`Failed to fetch market pools: ${response.status}`);
    }

    const data = await response.json();
    return { pools: data.pools ?? [] };
}

function marketFromDefAndPool(def, pool, site) {
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
}

function mergeMarkets(marketDefs, marketPools, site) {
    const poolsById = Object.fromEntries(
        marketPools.pools.map((p) => [p.market_id, p])
    );

    return marketDefs.markets.map((def) => marketFromDefAndPool(def, poolsById[def.id], site));
}

function applyMarketPoolUpdates(marketPools, site) {
    const poolsById = Object.fromEntries(
        marketPools.pools.map((p) => [p.market_id, p])
    );
    const defsById = Object.fromEntries(
        (window.ORACLE_DATA?.marketDefs?.markets ?? []).map((d) => [d.id, d])
    );

    markets = markets.map((market) => {
        const pool = poolsById[market.id];
        const def = defsById[market.id];
        if (!pool || !def) return market;
        return marketFromDefAndPool(def, pool, site);
    });
}

async function ensureResolvedPools() {
    if (resolvedPoolsLoaded) return;
    if (resolvedPoolsLoading) return resolvedPoolsLoading;

    resolvedPoolsLoading = fetchMarketPools(siteData.site.marketsApiUrl, "resolved")
        .then((marketPools) => {
            applyMarketPoolUpdates(marketPools, siteData.site);
            resolvedPoolsLoaded = true;
            resolvedPoolsLoading = null;
        })
        .catch((err) => {
            resolvedPoolsLoading = null;
            throw err;
        });

    return resolvedPoolsLoading;
}

function equalOutcomePercent(outcomeCount) {
    return Math.round(100 / outcomeCount);
}

function resolveDefaultIcon(tags) {
    const defaultIcons = siteData?.defaultIcons;
    if (!defaultIcons || !tags?.length) return "";

    for (const key of Object.keys(defaultIcons)) {
        if (tags.includes(key)) return defaultIcons[key];
    }

    return "";
}

function normaliseMarket(raw, site) {
    const totalPool = raw.outcomes.reduce((sum, o) => sum + o.pool_size, 0);
    const evenPercent = equalOutcomePercent(raw.outcomes.length);
    const outcomes = raw.outcomes.map((o) => ({
        id: o.id,
        name: o.title,
        colour: o.colour,
        pool_size: o.pool_size,
        percent: totalPool ? Math.round((o.pool_size / totalPool) * 100) : evenPercent,
        url: `${site.defaultBetUrl}`,
        itemSummary: o.item_summary || `${raw.title} | ${o.title}`
    }));

    const yesOutcome = outcomes.find((o) => o.id === "yes");
    const noOutcome = outcomes.find((o) => o.id === "no");
    const isBinary = outcomes.length === 2 && yesOutcome && noOutcome;
    const history = buildChartHistory(raw);
    const leading = outcomes.reduce((a, b) => (a.percent > b.percent ? a : b));
    const primaryId = history.primaryId;
    const stats24h = compute24hStats(raw.history ?? [], totalPool, primaryId, raw.outcomes.length);

    return {
        id: raw.id,
        title: raw.title,
        short_title: raw.short_title,
        icon: raw.icon || resolveDefaultIcon(raw.tags),
        tags: raw.tags,
        endsAt: parseMarketEndMs(raw.ends),
        resolved: Boolean(raw.resolved && raw.winning_outcome),
        winningOutcome: raw.resolved && raw.winning_outcome ? raw.winning_outcome : null,
        winningOutcomeData: outcomes.find((o) => o.id === raw.winning_outcome) ?? null,
        type: isBinary ? "yes-no" : "multi",
        outcomes,
        yesPercent: yesOutcome?.percent ?? leading.percent,
        leadingOutcome: leading,
        betUrls: isBinary ? { yes: yesOutcome.url, no: noOutcome.url } : null,
        volume: formatVolume(totalPool),
        totalPool,
        subtitle: raw.tags.slice(0, 2).join(" • "),
        description: raw.description?.trim() || null,
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
    const total = totalPoolFromSnapshot(poolSizes);
    if (!total) return equalOutcomePercent(poolSizes.length);
    const size = poolSizes.find((p) => p.outcome === outcomeId)?.size ?? 0;
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

function compute24hStats(history, currentTotal, primaryId, outcomeCount) {
    const point24h = getHistoryPoint24hAgo(history);
    const latest = history.length ? [...history].sort((a, b) => a.date_time - b.date_time).at(-1) : null;
    const evenPercent = equalOutcomePercent(outcomeCount);

    const displayPercent = latest
        ? percentForOutcome(latest.pool_sizes, primaryId)
        : (currentTotal ? 0 : evenPercent);

    if (!point24h || !latest) {
        return { volume24h: 0, change: 0, displayPercent };
    }

    const totalThen = totalPoolFromSnapshot(point24h.pool_sizes);
    const percentThen = percentForOutcome(point24h.pool_sizes, primaryId);
    const volume24h = Math.max(0, currentTotal - totalThen);
    const change = Math.round((displayPercent - percentThen) * 10) / 10;

    return { volume24h, change, displayPercent };
}

function isBinaryOutcomes(outcomes) {
    const yesOutcome = outcomes.find((o) => o.id === "yes");
    const noOutcome = outcomes.find((o) => o.id === "no");
    return outcomes.length === 2 && Boolean(yesOutcome && noOutcome);
}

function percentFromSnapshot(poolSizes, outcomeId) {
    const total = totalPoolFromSnapshot(poolSizes);
    if (!total) return equalOutcomePercent(poolSizes.length);
    const size = poolSizes.find((p) => p.outcome === outcomeId)?.size ?? 0;
    return Math.round((size / total) * 1000) / 10;
}

function chartHistoryPoints(raw) {
    const history = [...(raw.history ?? [])].sort((a, b) => a.date_time - b.date_time);
    if (history.length !== 1) return history;

    const first = history[0];
    return [{
        date_time: first.date_time - 86400,
        pool_sizes: first.pool_sizes.map((p) => ({ outcome: p.outcome, size: 0 }))
    }, first];
}

function buildChartHistory(raw) {
    const history = chartHistoryPoints(raw);
    const labels = history.map((h) => formatChartDate(h.date_time));
    const primaryId = raw.outcomes.find((o) => o.id === "yes")?.id
        ?? raw.outcomes.reduce((a, b) => (a.pool_size > b.pool_size ? a : b)).id;

    if (!isBinaryOutcomes(raw.outcomes)) {
        const series = raw.outcomes.map((outcome) => ({
            id: outcome.id,
            name: outcome.title,
            colour: outcome.colour || "#3b82f6",
            values: history.map((h) => percentFromSnapshot(h.pool_sizes, outcome.id))
        }));

        return { labels, values: [], series, primaryId, mode: "multi" };
    }

    const values = history.map((h) => percentFromSnapshot(h.pool_sizes, primaryId));

    return { labels, values, series: null, primaryId, mode: "binary" };
}

function hasFeaturedChartHistory(market) {
    if (!market?.history?.labels?.length) return false;
    if (market.type === "multi") {
        return market.history.series?.some((line) => line.values?.length) ?? false;
    }
    return market.history.values?.length > 0;
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

function getZonedParts(ms, timeZone) {
    const parts = {};
    for (const p of new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
    }).formatToParts(new Date(ms))) {
        if (p.type !== "literal") parts[p.type] = Number(p.value);
    }
    return parts;
}

const marketEndCache = new Map();

function parseMarketEndMs(ends) {
    if (ends === null || ends === undefined || ends === "") return null;

    const cacheKey = String(ends);
    if (marketEndCache.has(cacheKey)) return marketEndCache.get(cacheKey);

    const unixSeconds = typeof ends === "number"
        ? ends
        : /^\d{10,13}$/.test(cacheKey)
            ? Number(cacheKey)
            : null;

    if (unixSeconds !== null) {
        const ms = unixSeconds < 1e12 ? unixSeconds * 1000 : unixSeconds;
        marketEndCache.set(cacheKey, ms);
        return ms;
    }

    const isoDate = cacheKey;
    const [year, month, day] = isoDate.split("-").map(Number);

    for (const offset of ["-04:00", "-05:00"]) {
        const ms = Date.parse(`${isoDate}T23:59:59${offset}`);
        const p = getZonedParts(ms, MARKET_END_TZ);
        if (
            p.year === year &&
            p.month === month &&
            p.day === day &&
            p.hour === 23 &&
            p.minute === 59 &&
            p.second === 59
        ) {
            marketEndCache.set(cacheKey, ms);
            return ms;
        }
    }

    const fallback = Date.parse(`${isoDate}T23:59:59-05:00`);
    marketEndCache.set(cacheKey, fallback);
    return fallback;
}

function formatEndEst(ms) {
    return new Intl.DateTimeFormat("en-US", {
        timeZone: MARKET_END_TZ,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short"
    }).format(ms);
}

function formatCountdown(endsAt) {
    const diff = endsAt - Date.now();
    if (diff <= 0) return "Ended";

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escapeHtml(str) {
    return escapeAttr(str);
}

function articleMarketIds(article) {
    if (Array.isArray(article.market_ids)) return article.market_ids;
    if (article.market_id) return [article.market_id];
    return [];
}

function isMarketEnded(endsAt) {
    return Boolean(endsAt && endsAt <= Date.now());
}

function marketEndsClasses(endsAt) {
    const remaining = endsAt - Date.now();
    const classes = ["market-ends"];
    if (remaining <= 0) classes.push("market-ends--ended");
    else if (remaining < 3600000) classes.push("market-ends--urgent");
    return classes.join(" ");
}

function setMarketCardEndedState(card, endsAt) {
    if (!card || !endsAt) return;

    const marketCard = card.closest?.("[data-market-id]") || card;
    const resolved = marketCard.dataset?.resolved === "true" || card.dataset?.resolved === "true";
    if (resolved) return;

    const ended = isMarketEnded(endsAt);
    card.classList.toggle("event-card--ended", ended && card.classList.contains("event-card"));
    card.classList.toggle("highlight--ended", ended && card.id === "featured-card");
    card.querySelectorAll("[data-bet-url]").forEach((btn) => {
        btn.disabled = ended;
    });
}

function marketEndsHtml(market) {
    if (isMarketResolved(market)) {
        return `<span class="market-ends market-ends--ended">Ended</span>`;
    }

    if (!market.endsAt) return "";

    const label = formatCountdown(market.endsAt);
    const title = formatEndEst(market.endsAt);

    return `<span class="${marketEndsClasses(market.endsAt)}" data-ends-at="${market.endsAt}" title="${escapeAttr(title)}">${label}</span>`;
}

function updateMarketEndTimers() {
    document.querySelectorAll(".market-ends[data-ends-at]").forEach((el) => {
        const endsAt = Number(el.dataset.endsAt);
        if (!endsAt) return;

        const remaining = endsAt - Date.now();
        el.className = marketEndsClasses(endsAt);
        el.textContent = formatCountdown(endsAt);
        el.title = formatEndEst(endsAt);
        setMarketCardEndedState(el.closest(".event-card, #featured-card"), endsAt);
    });
}

function startMarketEndTicker() {
    updateMarketEndTimers();
    if (marketEndTimer) return;
    marketEndTimer = setInterval(updateMarketEndTimers, 1000);
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

function isMarketResolved(market) {
    return Boolean(market.resolved && market.winningOutcome);
}

function isExpiredPendingResolution(market) {
    return !isMarketResolved(market)
        && Boolean(market.endsAt && market.endsAt <= Date.now() - EXPIRED_GRACE_MS);
}

function matchesNavFilter(market) {
    if (activeNavTag === "Resolved") return isMarketResolved(market);
    if (isMarketResolved(market)) return false;
    if (isStaticNavTab(activeNavTag)) return true;
    return market.tags.includes(activeNavTag);
}

function currentGridTag() {
    return activeNavTag === "Resolved" ? activeResolvedGridTag : activeGridTag;
}

function setCurrentGridTag(tag) {
    if (activeNavTag === "Resolved") activeResolvedGridTag = tag;
    else activeGridTag = tag;
}

function marketsForGridTags() {
    if (activeNavTag === "Resolved") return markets.filter(isMarketResolved);
    return markets.filter((m) => !isMarketResolved(m));
}

function buildGridTags() {
    const tagPools = new Map();
    const navCategories = new Set(siteData.navTags);

    for (const market of marketsForGridTags()) {
        for (const tag of market.tags) {
            tagPools.set(tag, (tagPools.get(tag) ?? 0) + market.totalPool);
        }
    }

    const sorted = [...tagPools.entries()]
        .filter(([tag]) => !navCategories.has(tag))
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag);

    return ["All", ...sorted];
}

function getFilteredMarkets() {
    const gridTag = currentGridTag();

    return markets.filter((m) => {
        let matchesGrid = gridTag === "All" || m.tags.includes(gridTag);
        let marketInfo = (m.title +  "," + m.tags.join(",")).toLowerCase();
        let matchesSearch = !searchQuery || marketInfo.includes(searchQuery);
        return matchesNavFilter(m) && matchesGrid && matchesSearch;
    });
}

function partitionExpiredPending(list) {
    if (activeNavTag === "Resolved") return list;

    const active = [];
    const deprioritized = [];

    for (const market of list) {
        if (isExpiredPendingResolution(market)) deprioritized.push(market);
        else active.push(market);
    }

    return [...active, ...deprioritized];
}

function sortByVolume(list) {
    return partitionExpiredPending([...list].sort((a, b) => b.totalPool - a.totalPool));
}

function sortByNewest(list) {
    return partitionExpiredPending([...list].sort((a, b) => b.addedAt - a.addedAt));
}

function sortResolved(list) {
    return [...list].sort((a, b) => b.totalPool - a.totalPool);
}

function getSortedMarkets() {
    const filtered = getFilteredMarkets();
    if (activeNavTag === "Resolved") return sortResolved(filtered);
    if (activeNavTag === "New") return sortByNewest(filtered);
    return sortByVolume(filtered);
}

function getHighlightMarkets() {
    const filtered = getFilteredMarkets();

    if (activeNavTag === "Resolved") {
        return sortResolved(filtered).slice(0, HIGHLIGHT_LIMIT);
    }

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
        .filter((a) => articleMarketIds(a).includes(marketId))
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
    const headline = article.link
        ? `<a class="news-headline" href="${escapeAttr(article.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.headline)}</a>`
        : `<div class="news-headline">${escapeHtml(article.headline)}</div>`;

    return `
        <div class="news-item">
            ${newsSourceIcon(article)}
            ${headline}
            <div class="news-time">${escapeHtml(article.time)}</div>
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

    document.getElementById("retry-pools-btn")?.addEventListener("click", retryLoadPools);

    document.addEventListener("keydown", (e) => {
        if (e.key === "/" && document.activeElement !== document.getElementById("search-bar")) {
            e.preventDefault();
            document.getElementById("search-bar").focus();
        }
    });
}

function showResolvedTabSkeleton() {
    const card = document.getElementById("featured-card");
    const gridTags = document.getElementById("grid-tags");
    const grid = document.getElementById("event-grid");
    const sidebars = document.getElementById("sidebars");
    const empty = document.getElementById("empty-state");

    if (featuredChartStore.chart) {
        featuredChartStore.chart.destroy();
        featuredChartStore.chart = null;
    }

    if (card) {
        card.classList.add("skeleton-featured");
        card.classList.remove("highlight--resolved", "highlight--ended", "fade-in");
        card.innerHTML = SKELETON_FEATURED_HTML;
    }

    if (gridTags) {
        gridTags.classList.add("skeleton-grid-tags");
        gridTags.innerHTML = SKELETON_GRID_TAGS_HTML;
    }

    if (grid) {
        grid.innerHTML = SKELETON_EVENT_CARD.repeat(6);
    }

    if (sidebars) {
        sidebars.innerHTML = SKELETON_SIDEBARS_HTML;
    }

    if (empty) empty.hidden = true;
}

function renderNavTabs() {
    const container = document.getElementById("tabs");
    container.classList.remove("skeleton-tabs");
    container.removeAttribute("aria-hidden");
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

    container.innerHTML = staticTabs + `<span class="tab-divider" aria-hidden="true"></span>` + dynamicTabs;

    container.querySelectorAll("[data-nav-tag]").forEach((btn) => {
        btn.addEventListener("click", async () => {
            if (!marketsReady) return;

            const tag = btn.dataset.navTag;
            activeNavTag = tag;
            featuredIndex = 0;
            renderNavTabs();

            if (tag === "Resolved" && !resolvedPoolsLoaded) {
                showResolvedTabSkeleton();

                try {
                    await ensureResolvedPools();
                } catch (err) {
                    console.error(err);
                }

                if (activeNavTag !== "Resolved") return;

                renderGridTags();
                renderFeatured();
                renderSidebars();
                renderMarkets();
                return;
            }

            renderGridTags();
            renderFeatured();
            renderSidebars();
            renderMarkets();
        });
    });
}

function resolvedOutcomesHtml(market, { featured = false } = {}) {
    const listClass = featured ? "outcomes-list featured-outcomes outcomes-list--resolved" : "outcomes-list outcomes-list--resolved";

    return `<div class="${listClass}">
        ${market.outcomes.map((o) => {
            const won = o.id === market.winningOutcome;
            return `<div class="outcome-row${won ? " outcome-row--winner" : ""}">
                <p class="outcome-name">${o.name}</p>
                <span class="outcome-pct${won ? " outcome-pct--winner" : " trail"}">${o.percent}%</span>
                ${won ? `<span class="outcome-winner-tag">Winner</span>` : ""}
            </div>`;
        }).join("")}
    </div>`;
}

function featuredChanceText(market) {
    if (isMarketResolved(market)) {
        return market.winningOutcomeData?.name ?? market.winningOutcome;
    }

    return market.type === "yes-no"
        ? `${market.yesPercent}% chance`
        : `${market.leadingOutcome.percent}% ${market.leadingOutcome.name}`;
}

function marketDescriptionHtml(market) {
    if (!market.description) return "";

    return `<div class="market-description">
        <svg class="market-description-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        <p class="market-description-text">${escapeHtml(market.description)}</p>
    </div>`;
}

function renderFeatured() {
    const list = getHighlightMarkets();
    const card = document.getElementById("featured-card");
    card.classList.remove("skeleton-featured", "highlight--resolved", "highlight--ended");
    card.classList.add("fade-in");

    if (!list.length) {
        let emptyMessage = searchQuery.length ?`No ${activeNavTag} markets for "${searchQuery}".` : `No ${activeNavTag} markets.`;

        card.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
        if (featuredChartStore.chart) { featuredChartStore.chart.destroy(); featuredChartStore.chart = null; }
        return;
    }

    if (featuredIndex >= list.length) featuredIndex = 0;
    const market = list[featuredIndex];
    const articles = getArticlesForMarket(market.id);
    const carouselHtml = buildCarouselHtml(list, featuredIndex);

    const featuredIcon = market.icon
        ? `<div class="featured-icon"><img src="${market.icon}" alt=""></div>`
        : `<div class="featured-icon">${initials(market.title)}</div>`;

    const chanceText = featuredChanceText(market);

    const resolved = isMarketResolved(market);
    const ended = !resolved && isMarketEnded(market.endsAt);

    if (resolved) card.classList.add("highlight--resolved");
    else if (ended) card.classList.add("highlight--ended");

    const actionButtons = marketDetailActionButtons(market, { featured: true });

    const changeHtml = resolved ? "" : `
                    <div class="change ${market.change >= 0 ? "up" : "down"}">
                        ${market.change >= 0 ? "▲" : "▼"} ${Math.abs(market.change)}%
                    </div>`;

    const showChart = hasFeaturedChartHistory(market);
    const graphHtml = showChart
        ? `<div class="graph-container${market.type === "multi" && !resolved ? " graph-container--multi" : ""}">
                <canvas id="marketChart"></canvas>
           </div>`
        : "";

    card.innerHTML = `
        <div class="featured-header">
            ${featuredIcon}
            <div class="featured-title-block">
                <div class="featured-subtitle">${market.subtitle}</div>
                <h2>${market.title}</h2>
            </div>
        </div>
        ${marketDescriptionHtml(market)}

        <div class="highlight-body${showChart ? "" : " highlight-body--no-chart"}">
            <div class="highlight-left">
                <div class="chance-row">
                    <div class="chance">${chanceText}</div>
                    ${changeHtml}
                </div>
                ${actionButtons}
                ${resolved ? "" : buildNewsFeedHtml(articles)}
            </div>
            ${graphHtml}
        </div>

        <div class="featured-footer">
            <span class="featured-footer-left">
                <span>${market.volume}</span>
                ${marketEndsHtml(market)}
            </span>
            ${carouselHtml}
        </div>
    `;

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
    updateMarketEndTimers();
}

function getChartYScale(values) {
    const dataMax = Math.max(...values, 1);
    const dataMin = Math.min(...values, 0);
    const range = Math.max(dataMax - dataMin, 1);
    let step = range > 35 ? 10 : 5;
    let yMax = Math.ceil(dataMax / step) * step;
    let yMin = Math.floor(dataMin / step) * step;

    if (yMax <= dataMax) yMax += step;
    if (yMin >= dataMin) yMin = Math.max(0, yMin - step);
    if (yMax - yMin < step * 2) yMax = yMin + step * 2;

    return { min: yMin, max: yMax, step };
}

function chartLineTension(pointCount) {
    return pointCount <= 2 ? 0 : 0.38;
}

function sparseLabelIndices(count) {
    if (count <= 3) return Array.from({ length: count }, (_, i) => i);
    const mid = Math.floor((count - 1) / 2);
    return [0, mid, count - 1];
}

function chartTooltipPlugin(displayColors) {
    return {
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
        displayColors,
        callbacks: {
            title: (items) => items[0]?.label ?? "",
            label: (c) => `${c.dataset.label ? `${c.dataset.label}: ` : ""}${c.raw}%`
        }
    };
}

function chartXScale(labels) {
    const visibleLabelIndices = new Set(sparseLabelIndices(labels.length));

    return {
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
    };
}

function chartYScaleRight({ min, max, step }) {
    return {
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
    };
}

function pointRadii(length, lastIndex, activeRadius, inactiveRadius = 0) {
    return Array.from({ length }, (_, i) => (i === lastIndex ? activeRadius : inactiveRadius));
}

async function renderFeaturedChart(market) {
    const canvas = document.getElementById("marketChart");
    await renderMarketChart(market, canvas, featuredChartStore);
}

async function renderMarketChart(market, canvas, chartStore) {
    if (chartStore.chart) {
        chartStore.chart.destroy();
        chartStore.chart = null;
    }

    if (!canvas || !hasFeaturedChartHistory(market)) return;

    if (market.type === "multi" && market.history.series?.length) {
        await renderMultiChart(market, canvas, chartStore);
        return;
    }

    if (!market.history.values.length) return;
    await renderBinaryChart(market, canvas, chartStore);
}

async function renderBinaryChart(market, canvas, chartStore) {
    const Chart = await loadChartJs();
    const ctx = canvas.getContext("2d");
    const values = market.history.values;
    const labels = market.history.labels;
    const lastIndex = values.length - 1;
    const yScale = isMarketResolved(market)
        ? { min: 0, max: 100, step: 25 }
        : getChartYScale(values);

    chartStore.chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Yes",
                data: values,
                borderColor: "#3b82f6",
                borderWidth: 2,
                tension: chartLineTension(values.length),
                capBezierPoints: true,
                pointRadius: pointRadii(values.length, lastIndex, 4),
                pointHoverRadius: pointRadii(values.length, lastIndex, 5),
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
                tooltip: chartTooltipPlugin(false)
            },
            interaction: { mode: "index", intersect: false },
            scales: {
                x: chartXScale(labels),
                y: chartYScaleRight(yScale)
            }
        }
    });
}

async function renderMultiChart(market, canvas, chartStore) {
    const Chart = await loadChartJs();
    const ctx = canvas.getContext("2d");
    const labels = market.history.labels;
    const series = market.history.series;
    const lastIndex = labels.length - 1;

    chartStore.chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: series.map((line) => ({
                label: line.name,
                data: line.values,
                borderColor: line.colour,
                backgroundColor: line.colour,
                borderWidth: 2,
                tension: chartLineTension(line.values.length),
                capBezierPoints: true,
                fill: false,
                pointRadius: pointRadii(line.values.length, lastIndex, 3),
                pointHoverRadius: pointRadii(line.values.length, lastIndex, 4),
                pointBackgroundColor: line.colour,
                pointBorderColor: "#e6edf3",
                pointBorderWidth: 1.5,
                pointHitRadius: 10
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 6, right: 2, bottom: 4, left: 0 } },
            animation: { duration: 600, easing: "easeOutQuart" },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    align: "start",
                    labels: {
                        color: "#9ca3af",
                        font: { size: 11, weight: "500" },
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: "circle"
                    }
                },
                tooltip: chartTooltipPlugin(true)
            },
            interaction: { mode: "index", intersect: false },
            scales: {
                x: chartXScale(labels),
                y: chartYScaleRight({ min: 0, max: 100, step: 25 })
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
    container.classList.remove("skeleton-grid-tags");
    const gridTags = buildGridTags();
    let gridTag = currentGridTag();

    if (!gridTags.includes(gridTag)) {
        gridTag = "All";
        setCurrentGridTag("All");
    }

    container.innerHTML = gridTags.map((tag) => {
        const active = tag === gridTag ? " active" : "";
        return `<button class="grid-tag${active}" data-grid-tag="${tag}" type="button">${tag}</button>`;
    }).join("");

    container.querySelectorAll("[data-grid-tag]").forEach((btn) => {
        btn.addEventListener("click", () => {
            if (!marketsReady) return;
            setCurrentGridTag(btn.dataset.gridTag);
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

    grid.querySelectorAll(".arc-fill").forEach((arc) => {
        animateArc(arc, Number(arc.dataset.percent));
    });

    updateMarketEndTimers();
}

function marketIconHtml(market) {
    if (market.icon) {
        return `<div class="market-icon"><img src="${market.icon}" alt=""></div>`;
    }
    return `<div class="market-icon">${initials(market.title)}</div>`;
}

function renderMarketCard(market, index) {
    const delay = Math.min(index * 0.04, 0.4);
    const resolved = isMarketResolved(market);
    const ended = !resolved && isMarketEnded(market.endsAt);
    const stateClass = resolved ? " event-card--resolved" : (ended ? " event-card--ended" : "");
    const disabledAttr = ended ? " disabled" : "";

    if (resolved) {
        return `
            <article class="event-card${stateClass} fade-in" style="animation-delay:${delay}s" data-market-id="${market.id}" data-resolved="true">
                <div class="event-card-top">
                    <div class="event-card-header">
                        ${marketIconHtml(market)}
                        <h3 class="event-card-title">${market.title}</h3>
                    </div>
                </div>
                ${resolvedOutcomesHtml(market)}
                <div class="card-meta">
                    <span>${market.volume}</span>
                    ${marketEndsHtml(market)}
                </div>
            </article>
        `;
    }

    if (market.type === "multi") {
        const maxPct = Math.max(...market.outcomes.map((o) => o.percent));
        return `
            <article class="event-card${stateClass} fade-in" style="animation-delay:${delay}s" data-market-id="${market.id}">
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
                            <button class="btn-bet" ${betButtonAttrs(o, market.title)} type="button"${disabledAttr}>Bet</button>
                        </div>
                    `).join("")}
                </div>
                <div class="card-meta">
                    <span>${market.volume}</span>
                    ${marketEndsHtml(market)}
                </div>
            </article>
        `;
    }

    const yesOutcome = market.outcomes.find((o) => o.id === "yes");
    const noOutcome = market.outcomes.find((o) => o.id === "no");

    return `
        <article class="event-card${stateClass} fade-in" style="animation-delay:${delay}s" data-market-id="${market.id}">
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
                <button class="btn-yes" ${betButtonAttrs(yesOutcome, market.title)} type="button"${disabledAttr}>Yes</button>
                <button class="btn-no" ${betButtonAttrs(noOutcome, market.title)} type="button"${disabledAttr}>No</button>
            </div>
            <div class="card-meta">
                <span>${market.volume}</span>
                ${marketEndsHtml(market)}
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
    if (count <= 1) {
        return `<div class="featured-footer-center"></div><div class="featured-footer-right"></div>`;
    }

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

    return `
        <div class="featured-footer-center">${dots}</div>
        <div class="featured-footer-right">${nav}</div>
    `;
}

function betButtonAttrs(outcome, marketTitle) {
    const search = outcome.itemSummary || `${marketTitle} | ${outcome.name}`;
    return `data-bet-url="${escapeAttr(outcome.url)}" data-bet-search="${escapeAttr(search)}" data-outcome-name="${escapeAttr(outcome.name)}" data-market-title="${escapeAttr(marketTitle)}"`;
}

function openBetModal(btn) {
    const modal = document.getElementById("bet-modal");
    if (!modal) return;

    const marketEl = document.getElementById("bet-modal-market");
    const outcomeEl = document.getElementById("bet-modal-outcome");
    const searchEl = document.getElementById("bet-modal-search");
    const storeLink = document.getElementById("bet-modal-store-link");

    if (marketEl) marketEl.textContent = btn.dataset.marketTitle || "";
    if (outcomeEl) outcomeEl.textContent = btn.dataset.outcomeName || "";
    if (searchEl) searchEl.textContent = btn.dataset.betSearch || "";
    if (storeLink) {
        storeLink.href = btn.dataset.betUrl || siteData?.site?.defaultBetUrl || "#";
    }

    modal.hidden = false;
    document.body.classList.add("bet-modal-open");
    document.getElementById("bet-modal-close")?.focus();
}

function closeBetModal() {
    const modal = document.getElementById("bet-modal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("bet-modal-open");
}

function bindBetModal() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-yes, .btn-no, .btn-bet");
        if (!btn?.dataset.betUrl || btn.disabled) return;

        e.preventDefault();
        openBetModal(btn);
    });

    document.getElementById("bet-modal")?.addEventListener("click", (e) => {
        if (e.target.closest("[data-bet-modal-close]")) closeBetModal();
    });

    document.getElementById("bet-modal-copy")?.addEventListener("click", async () => {
        const search = document.getElementById("bet-modal-search")?.textContent;
        if (!search) return;

        try {
            await navigator.clipboard.writeText(search);
            const copyBtn = document.getElementById("bet-modal-copy");
            if (copyBtn) {
                const original = copyBtn.textContent;
                copyBtn.textContent = "Copied";
                setTimeout(() => { copyBtn.textContent = original; }, 1500);
            }
        } catch (_) {}
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (document.body.classList.contains("bet-modal-open")) {
            closeBetModal();
            return;
        }
        if (document.body.classList.contains("market-modal-open")) {
            closeMarketModal();
            return;
        }
        if (document.body.classList.contains("info-modal-open")) {
            closeInfoModal();
        }
    });
}

function marketDetailActionButtons(market, { featured = false } = {}) {
    const resolved = isMarketResolved(market);
    const ended = !resolved && isMarketEnded(market.endsAt);
    const disabledAttr = ended ? " disabled" : "";

    if (resolved) {
        return resolvedOutcomesHtml(market, { featured });
    }

    if (market.type === "yes-no") {
        const yesOutcome = market.outcomes.find((o) => o.id === "yes");
        const noOutcome = market.outcomes.find((o) => o.id === "no");
        const rowClass = featured ? "btn-row" : "btn-row btn-row--compact";
        return `<div class="${rowClass}">
            <button class="btn-yes" ${betButtonAttrs(yesOutcome, market.title)} type="button"${disabledAttr}>Yes</button>
            <button class="btn-no" ${betButtonAttrs(noOutcome, market.title)} type="button"${disabledAttr}>No</button>
        </div>`;
    }

    const listClass = featured ? "outcomes-list featured-outcomes" : "outcomes-list";
    return `<div class="${listClass}">
        ${market.outcomes.map((o) => `
            <div class="outcome-row">
                <p class="outcome-name">${o.name}</p>
                <span class="outcome-pct lead">${o.percent}%</span>
                <button class="btn-bet" ${betButtonAttrs(o, market.title)} type="button"${disabledAttr}>Bet</button>
            </div>
        `).join("")}
    </div>`;
}

function buildMarketDetailHtml(market) {
    const articles = getArticlesForMarket(market.id);
    const resolved = isMarketResolved(market);
    const ended = !resolved && isMarketEnded(market.endsAt);
    const stateClass = ended ? " highlight--ended" : "";

    const icon = market.icon
        ? `<div class="featured-icon"><img src="${market.icon}" alt=""></div>`
        : `<div class="featured-icon">${initials(market.title)}</div>`;

    const chanceText = featuredChanceText(market);
    const changeHtml = `
        <div class="change ${market.change >= 0 ? "up" : "down"}">
            ${market.change >= 0 ? "▲" : "▼"} ${Math.abs(market.change)}%
        </div>`;

    const chanceRowHtml = resolved ? "" : `
                    <div class="chance-row">
                        <div class="chance">${chanceText}</div>
                        ${changeHtml}
                    </div>`;

    const showChart = hasFeaturedChartHistory(market);
    const graphHtml = showChart
        ? `<div class="graph-container market-modal-graph${market.type === "multi" && !resolved ? " graph-container--multi" : ""}">
            <canvas id="market-modal-chart"></canvas>
        </div>`
        : "";

    return `
        <div class="market-modal-detail${stateClass}">
            <header class="featured-header">
                ${icon}
                <div class="featured-title-block">
                    <div class="featured-subtitle">${market.subtitle}</div>
                    <h2 id="market-modal-title">${market.title}</h2>
                </div>
            </header>
            ${marketDescriptionHtml(market)}
            <div class="highlight-body market-modal-body${showChart ? "" : " highlight-body--no-chart"}">
                <div class="highlight-left">
                    ${chanceRowHtml}
                    ${marketDetailActionButtons(market, { featured: resolved })}
                    ${resolved ? "" : buildNewsFeedHtml(articles)}
                </div>
                ${graphHtml}
            </div>
            <div class="featured-footer market-modal-footer">
                <span class="featured-footer-left">
                    <span>${market.volume}</span>
                    ${marketEndsHtml(market)}
                </span>
            </div>
        </div>
    `;
}

function openMarketModal(marketId) {
    const market = markets.find((m) => m.id === marketId);
    const modal = document.getElementById("market-modal");
    const content = document.getElementById("market-modal-content");
    if (!market || !modal || !content) return;

    content.innerHTML = buildMarketDetailHtml(market);
    modal.hidden = false;
    document.body.classList.add("market-modal-open");
    modal.querySelector(".market-modal-panel")?.classList.toggle(
        "market-modal-panel--resolved",
        isMarketResolved(market)
    );
    document.getElementById("market-modal-close")?.focus();

    const canvas = document.getElementById("market-modal-chart");
    renderMarketChart(market, canvas, modalChartStore);
    updateMarketEndTimers();
}

function closeMarketModal() {
    const modal = document.getElementById("market-modal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("market-modal-open");
    modal.querySelector(".market-modal-panel")?.classList.remove("market-modal-panel--resolved");

    if (modalChartStore.chart) {
        modalChartStore.chart.destroy();
        modalChartStore.chart = null;
    }
}

function bindMarketModal() {
    document.getElementById("event-grid")?.addEventListener("click", (e) => {
        if (e.target.closest(".btn-yes, .btn-no, .btn-bet")) return;

        const card = e.target.closest(".event-card[data-market-id]");
        if (!card) return;

        openMarketModal(card.dataset.marketId);
    });

    document.getElementById("market-modal")?.addEventListener("click", (e) => {
        if (e.target.closest("[data-market-modal-close]")) closeMarketModal();
    });
}

function truncateTitle(title, max = 18) {
    return title.length > max ? title.slice(0, max) + "…" : title;
}

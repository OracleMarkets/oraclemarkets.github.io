(function () {
    const COOKIE_KEY = "oracle_hidden_market_unlocked";
    const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10;

    const state = {
        config: null,
        market: null,
        visible: false
    };

    function readCookie() {
        const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function writeCookie() {
        document.cookie = `${COOKIE_KEY}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }

    function isUnlocked() {
        return readCookie() === "1";
    }

    function parseMarketEndMs(ends) {
        return ends ? ends * 1000 : null;
    }

    function buildMarket(config) {
        const yesLabel = config.encryptedOutcomes?.yes ?? "???";
        const noLabel = config.encryptedOutcomes?.no ?? "???";
        const endsAt = parseMarketEndMs(config.ends);

        const outcomes = [
            {
                id: "yes",
                name: yesLabel,
                colour: "#16c784",
                pool_size: 0,
                percent: 85,
                url: "",
                itemSummary: `${config.title} | ${yesLabel}`
            },
            {
                id: "no",
                name: noLabel,
                colour: "#ea3943",
                pool_size: 0,
                percent: 15,
                url: "",
                itemSummary: `${config.title} | ${noLabel}`
            }
        ];

        return {
            id: config.id,
            title: config.title,
            short_title: config.short_title ?? config.title,
            icon: config.icon ?? "",
            tags: config.tags ?? [],
            endsAt,
            resolved: false,
            winningOutcome: null,
            winningOutcomeData: null,
            type: "yes-no",
            isHiddenMarket: true,
            outcomes,
            yesPercent: 85,
            leadingOutcome: outcomes[0],
            betUrls: null,
            totalPool: 0,
            subtitle: (config.tags ?? []).slice(0, 2).join(" • "),
            description: config.description?.trim() || null,
            sponsored: false,
            change: 0,
            volume24h: 0,
            displayPercent: 85,
            history: { points: [], primaryId: "yes" },
            addedAt: config.added_at ?? 0
        };
    }

    function init(siteBundle) {
        const config = siteBundle?.hiddenMarket;
        if (!config?.enabled || !config.id || !config.title) {
            state.config = null;
            state.market = null;
            state.visible = false;
            return;
        }

        state.config = config;
        state.market = buildMarket(config);
        state.visible = isUnlocked() || Math.random() < (config.showProbability ?? 0.25);
    }

    function getMarket() {
        return state.visible ? state.market : null;
    }

    function isHiddenMarketId(marketId) {
        return Boolean(state.market && state.market.id === marketId);
    }

    function matchesListFilters({ activeNavTag, gridTag, searchQuery, matchesNavFilter }) {
        const market = state.market;
        if (!market || !state.visible) return false;
        if (activeNavTag === "Resolved") return false;
        if (!matchesNavFilter(market)) return false;

        const matchesGrid = gridTag === "All" || market.tags.includes(gridTag);
        const marketInfo = (market.title + "," + market.tags.join(",")).toLowerCase();
        const matchesSearch = !searchQuery || marketInfo.includes(searchQuery);
        return matchesGrid && matchesSearch;
    }

    function betButtonAttrs(outcome, marketTitle) {
        const search = outcome.itemSummary || `${marketTitle} | ${outcome.name}`;
        return `data-hidden-market-bet="true" data-bet-search="${escapeAttr(search)}" data-outcome-name="${escapeAttr(outcome.name)}" data-market-title="${escapeAttr(marketTitle)}"`;
    }

    function escapeAttr(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function onBetClick() {
        if (!state.config) return;

        writeCookie();
        state.visible = true;

        const url = state.config.intranetBetUrl || "intranet/";
        window.location.href = url;
    }

    window.OracleHiddenMarket = {
        init,
        getMarket,
        isHiddenMarketId,
        matchesListFilters,
        betButtonAttrs,
        onBetClick,
        isUnlocked
    };
})();

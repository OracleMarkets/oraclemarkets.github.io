(function () {
    const COOKIE_KEY = "oracle_currency_id";
    const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
    const state = {
        baseCurrencyId: null,
        ammPoolsApiUrl: null,
        currencies: [],
        currenciesById: new Map(),
        selectedId: null,
        pools: null,
        poolsReady: false
    };

    function readCookie() {
        const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function writeCookie(currencyId) {
        document.cookie = `${COOKIE_KEY}=${encodeURIComponent(currencyId)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }

    function getSelectedCurrency() {
        return state.currenciesById.get(state.selectedId) ?? null;
    }

    function calculateExchange(fromCurrencyId, amountIn, toCurrencyId) {
        if (amountIn <= 0) {
            return { amountOut: 0, midMarketRate: 1 };
        }

        if (fromCurrencyId === toCurrencyId) {
            return { amountOut: amountIn, midMarketRate: 1 };
        }

        const pools = state.pools;
        if (!pools?.length) {
            return { amountOut: amountIn, midMarketRate: 1 };
        }

        const fromPool = pools.find((p) => p.currency_id === fromCurrencyId);
        const toPool = pools.find((p) => p.currency_id === toCurrencyId);

        if (!fromPool || !toPool) {
            return { amountOut: amountIn, midMarketRate: 1 };
        }

        const fromReserve = parseFloat(fromPool.currency_reserve);
        const fromUnitReserve = parseFloat(fromPool.unit_reserve);
        const toReserve = parseFloat(toPool.currency_reserve);
        const toUnitReserve = parseFloat(toPool.unit_reserve);

        const baseOut = (fromUnitReserve * amountIn) / (fromReserve + amountIn);
        const amountOut = (toReserve * baseOut) / (toUnitReserve + baseOut);
        const midRate = parseFloat(fromPool.rate) / parseFloat(toPool.rate);
        const midAmountOut = amountIn * midRate;

        return {
            amountOut: Number(amountOut.toFixed(8)),
            midMarketRate: Number(midRate.toFixed(8)),
            midMarketAmountOut: Number(midAmountOut.toFixed(8))
        };
    }

    function convertFromBase(amount) {
        const numeric = Number(amount) || 0;
        if (!state.poolsReady || state.selectedId === state.baseCurrencyId) {
            return numeric;
        }

        return calculateExchange(state.baseCurrencyId, numeric, state.selectedId).amountOut;
    }

    function displayCurrency() {
        if (!state.poolsReady || state.selectedId === state.baseCurrencyId) {
            return state.currenciesById.get(state.baseCurrencyId) ?? null;
        }

        return getSelectedCurrency();
    }

    function formatCompactAmount(amount) {
        const value = Number(amount) || 0;
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
        if (value >= 100) return Math.round(value).toLocaleString("en-US");
        if (value >= 1) return value.toFixed(1);
        if (value > 0) return value.toFixed(2);
        return "0";
    }

    function formatAmount(amount, { suffix = "" } = {}) {
        const converted = convertFromBase(amount);
        const currency = displayCurrency();
        const label = currency?.name ?? "Bedro";
        const amountText = formatCompactAmount(converted);
        return suffix ? `${amountText} ${label} ${suffix}` : `${amountText} ${label}`;
    }

    function formatVolume(amount) {
        return formatAmount(amount, { suffix: "Vol." });
    }

    function formatVolumeToday(amount) {
        if (!amount) return formatAmount(0, { suffix: "today" });
        return formatAmount(amount, { suffix: "today" });
    }

    function formatPot(amount) {
        return formatAmount(amount);
    }

    function applyPools(pools) {
        state.pools = Array.isArray(pools) ? pools : [];
        state.poolsReady = state.pools.length > 0;
        if (state.poolsReady) {
            window.dispatchEvent(new CustomEvent("oracle:currencychange"));
        }
    }

    async function fetchAmmPools() {
        if (state.ammPoolsApiUrl) {
            try {
                const response = await fetch(state.ammPoolsApiUrl);
                if (response.ok) {
                    const payload = await response.json();
                    applyPools(payload.pools ?? payload?.data?.api);
                    return;
                }
            } catch (err) {
                console.warn("Oracle AMM pools API unavailable, using bundled rates:", err);
            }
        }

        try {
            const bundled = await (window.__ORACLE_AMM_POOLS_PROMISE__ ?? Promise.reject(new Error("No bundled pools")));
            applyPools(bundled.pools);
        } catch (err) {
            console.warn("Oracle currency pools unavailable:", err);
        }
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

    function currencyIconHtml(currency) {
        if (currency.currency_icon_url) {
            return `<img class="currency-option-icon" src="${currency.currency_icon_url}" alt="" loading="lazy">`;
        }

        const letter = (currency.name || "?").charAt(0).toUpperCase();
        return `<span class="currency-option-icon currency-option-icon--fallback" aria-hidden="true">${letter}</span>`;
    }

    function renderCurrencyPicker() {
        const container = document.getElementById("footer-currencies");
        if (!container) return;

        const sorted = [...state.currencies].sort((a, b) => {
            if (a.id === state.baseCurrencyId) return -1;
            if (b.id === state.baseCurrencyId) return 1;
            return a.name.localeCompare(b.name);
        });

        container.innerHTML = sorted.map((currency) => {
            const active = currency.id === state.selectedId ? " active" : "";
            const selected = currency.id === state.selectedId ? ' aria-selected="true"' : ' aria-selected="false"';
            return `<button type="button" class="currency-option${active}" data-currency-id="${currency.id}" role="option"${selected} title="${escapeAttr(currency.nation_name)}">
                ${currencyIconHtml(currency)}
                <span class="currency-option-name">${escapeHtml(currency.name)}</span>
            </button>`;
        }).join("");

        container.querySelectorAll("[data-currency-id]").forEach((btn) => {
            btn.addEventListener("click", () => selectCurrency(btn.dataset.currencyId));
        });
    }

    function selectCurrency(currencyId) {
        if (!state.currenciesById.has(currencyId) || currencyId === state.selectedId) return;

        state.selectedId = currencyId;
        writeCookie(currencyId);
        renderCurrencyPicker();
        window.dispatchEvent(new CustomEvent("oracle:currencychange"));
    }

    function init(config) {
        if (!config?.currencies?.length) return;

        state.baseCurrencyId = config.baseCurrencyId;
        state.ammPoolsApiUrl = config.ammPoolsApiUrl ?? null;
        state.currencies = config.currencies;
        state.currenciesById = new Map(config.currencies.map((c) => [c.id, c]));

        const saved = readCookie();
        state.selectedId = state.currenciesById.has(saved) ? saved : state.baseCurrencyId;

        if (!state.currenciesById.has(state.selectedId)) {
            state.selectedId = state.baseCurrencyId;
        }

        renderCurrencyPicker();
        fetchAmmPools();
    }

    function boot() {
        const config = window.ORACLE_DATA?.currencies;
        if (!config) return;

        init({
            ...config,
            ammPoolsApiUrl: window.ORACLE_DATA?.site?.site?.ammPoolsApiUrl ?? null
        });
    }

    window.OracleCurrency = {
        init,
        getSelectedId: () => state.selectedId,
        getSelectedCurrency,
        convertFromBase,
        formatAmount,
        formatVolume,
        formatVolumeToday,
        formatPot,
        isReady: () => state.poolsReady
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();

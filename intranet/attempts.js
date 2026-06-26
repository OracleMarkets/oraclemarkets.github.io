(function () {
    const ATTEMPTS_KEY = "oracle_intranet_login_attempts";
    const MAX_ATTEMPTS = 5;
    const WINDOW_MS = 15 * 60 * 1000;

    function loadTimestamps() {
        try {
            const raw = sessionStorage.getItem(ATTEMPTS_KEY);
            if (!raw) return [];

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];

            const cutoff = Date.now() - WINDOW_MS;
            return parsed.filter((value) => typeof value === "number" && value > cutoff);
        } catch {
            return [];
        }
    }

    function saveTimestamps(timestamps) {
        sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(timestamps));
    }

    function getAttempts() {
        return loadTimestamps().length;
    }

    function incrementAttempts() {
        const next = loadTimestamps().concat(Date.now());
        saveTimestamps(next);
        return next.length;
    }

    function clearAttempts() {
        sessionStorage.removeItem(ATTEMPTS_KEY);
    }

    function isLockedOut() {
        return getAttempts() >= MAX_ATTEMPTS;
    }

    function remainingAttempts() {
        return Math.max(0, MAX_ATTEMPTS - getAttempts());
    }

    function getIntranetBase() {
        const idx = window.location.pathname.indexOf("/intranet");
        if (idx !== -1) {
            return `${window.location.pathname.slice(0, idx + "/intranet".length)}/`;
        }
        return "/intranet/";
    }

    function getIntranetHomeUrl(search = "") {
        const base = getIntranetBase();
        if (!search) return base;
        return base + (search.startsWith("?") ? search : `?${search}`);
    }

    function getIntranetAlertUrl() {
        return `${getIntranetBase()}alert/`;
    }

    window.OracleIntranetAttempts = {
        MAX_ATTEMPTS,
        WINDOW_MS,
        getAttempts,
        incrementAttempts,
        clearAttempts,
        isLockedOut,
        remainingAttempts,
        getIntranetBase,
        getIntranetHomeUrl,
        getIntranetAlertUrl
    };
})();

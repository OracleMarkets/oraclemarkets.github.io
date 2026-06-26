(function () {
    const COOKIE_KEY = "oracle_intranet_overlay";
    const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

    function readCookie() {
        const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
        return match ? decodeURIComponent(match[1]) : null;
    }

    function writeCookie(enabled) {
        document.cookie = `${COOKIE_KEY}=${enabled ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    }

    function isEnabled() {
        const value = readCookie();
        return value === null || value === "1";
    }

    function getButtons() {
        return Array.from(document.querySelectorAll(".intranet-overlay-toggle"));
    }

    function applyState(enabled) {
        document.body.classList.toggle("intranet-overlay-off", !enabled);

        getButtons().forEach((button) => {
            button.setAttribute("aria-pressed", String(enabled));
            button.title = enabled ? "Turn overlay off" : "Turn overlay on";
        });
    }

    function init() {
        applyState(isEnabled());

        getButtons().forEach((button) => {
            button.addEventListener("click", () => {
                const enabled = document.body.classList.contains("intranet-overlay-off");
                applyState(enabled);
                writeCookie(enabled);
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();

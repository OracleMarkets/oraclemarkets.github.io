(function () {
    const prefetched = new Set();

    function prefetch(url) {
        try {
            const abs = new URL(url, location.href);
            if (abs.origin !== location.origin) return;

            const href = abs.href;
            if (prefetched.has(href)) return;

            prefetched.add(href);
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.href = href;
            document.head.appendChild(link);
        } catch (_) {}
    }

    function bindPrefetch(link) {
        const href = link.getAttribute("href");
        if (!href || href === "#") return;

        const warm = () => prefetch(href);
        link.addEventListener("mouseenter", warm, { passive: true });
        link.addEventListener("focus", warm, { passive: true });
    }

    document
        .querySelectorAll(".leaderboard-nav a[href], .logo[href], .footer-logo-link[href]")
        .forEach(bindPrefetch);

    function enablePageEnterFallback() {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        document.documentElement.classList.add("page-enter-fallback");
    }

    let pageReady = false;

    async function handlePageReveal(event) {
        if (pageReady) return;
        pageReady = true;

        if (event?.viewTransition) {
            try {
                await event.viewTransition.finished;
            } catch (_) {}
        } else {
            enablePageEnterFallback();
        }

        document.documentElement.classList.add("page-revealed");
        window.dispatchEvent(new CustomEvent("oracle:pageready"));
    }

    if ("onpagereveal" in window) {
        window.addEventListener("pagereveal", handlePageReveal);
        document.addEventListener("DOMContentLoaded", () => {
            requestAnimationFrame(() => {
                if (!pageReady) handlePageReveal(null);
            });
        });
    } else {
        document.addEventListener("DOMContentLoaded", () => handlePageReveal(null));
    }
})();

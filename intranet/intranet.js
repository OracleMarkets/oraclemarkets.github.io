document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const card = document.getElementById("login-card");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const passwordToggle = document.getElementById("password-toggle");
    const statusEl = document.getElementById("login-status");
    const submitBtn = document.getElementById("login-submit");
    const submitLabel = submitBtn?.querySelector(".intranet-submit-label");
    const submitSpinner = submitBtn?.querySelector(".intranet-submit-spinner");
    const attemptsApi = window.OracleIntranetAttempts;

    if (!form || !usernameInput || !passwordInput || !statusEl || !submitBtn || !attemptsApi) {
        document.documentElement.classList.remove("intranet-restoring");
        document.body.classList.remove("intranet-restoring");
        return;
    }

    const API_BASE = "https://oracle-markets-backend.vercel.app";
    const AUTH_COOKIE_KEY = "oracle_intranet_auth";
    const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
    const params = new URLSearchParams(window.location.search);

    function redirectIfLockedOut() {
        if (attemptsApi.isLockedOut()) {
            window.location.href = attemptsApi.getIntranetAlertUrl();
            return true;
        }
        return false;
    }

    function writeAuthCookie(username, password) {
        const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ u: username, p: password }))));
        document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(payload)}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
    }

    function readAuthCookie() {
        const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE_KEY}=([^;]*)`));
        if (!match) return null;
        try {
            const parsed = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(match[1])))));
            if (!parsed?.u || !parsed?.p) return null;
            return { username: parsed.u, password: parsed.p };
        } catch {
            return null;
        }
    }

    function clearAuthCookie() {
        document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }

    async function loginRequest(username, password) {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            return { ok: true, data: await res.json() };
        }

        if (res.status === 401 || res.status === 403) {
            return { ok: false, denied: true };
        }

        throw new Error(`HTTP ${res.status}`);
    }

    function setStatus(message, type = "") {
        statusEl.textContent = message;
        statusEl.classList.remove("is-error", "is-success");
        if (type) statusEl.classList.add(`is-${type}`);
    }

    function setFieldInvalid(input, invalid) {
        input.classList.toggle("is-invalid", invalid);
        if (invalid) {
            input.setAttribute("aria-invalid", "true");
        } else {
            input.removeAttribute("aria-invalid");
        }
    }

    function validateForm() {
        let valid = true;

        if (!usernameInput.value.trim()) {
            setFieldInvalid(usernameInput, true);
            valid = false;
        } else {
            setFieldInvalid(usernameInput, false);
        }

        if (!passwordInput.value) {
            setFieldInvalid(passwordInput, true);
            valid = false;
        } else {
            setFieldInvalid(passwordInput, false);
        }

        if (!valid) {
            setStatus("Enter both your username and password.", "error");
            shake();
        }

        return valid;
    }

    function shake() {
        card?.classList.add("is-shake");
        window.setTimeout(() => card?.classList.remove("is-shake"), 450);
    }

    function setLoading(loading) {
        submitBtn.disabled = loading;
        card?.classList.toggle("is-loading", loading);
        if (submitLabel) submitLabel.hidden = loading;
        if (submitSpinner) submitSpinner.hidden = !loading;
    }

    passwordToggle?.addEventListener("click", () => {
        const show = passwordInput.type === "password";
        passwordInput.type = show ? "text" : "password";
        passwordToggle.setAttribute("aria-pressed", String(show));
        passwordToggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });

    usernameInput.addEventListener("input", () => {
        if (usernameInput.value.trim()) setFieldInvalid(usernameInput, false);
    });

    passwordInput.addEventListener("input", () => {
        if (passwordInput.value) setFieldInvalid(passwordInput, false);
    });

    document.getElementById("portal-signout")?.addEventListener("click", signOut);

    function showSkeletonRestore() {
        document.documentElement.classList.add("intranet-restoring");
        document.body.classList.add("intranet-restoring");

        const panel = document.getElementById("portal-restore-skeleton");
        if (panel) panel.setAttribute("aria-busy", "true");

        const msgSection = document.querySelector('.portal-section[data-section="messages"]');
        if (msgSection) msgSection.hidden = false;
    }

    function hideSkeletonRestore() {
        document.documentElement.classList.remove("intranet-restoring");
        document.body.classList.remove("intranet-restoring");

        const panel = document.getElementById("portal-restore-skeleton");
        if (panel) panel.setAttribute("aria-busy", "false");
    }

    function signOut() {
        attemptsApi.clearAttempts();
        clearAuthCookie();
        document.body.classList.remove("portal-page", "intranet-restoring");
        document.documentElement.classList.remove("intranet-restoring");
        hideSkeletonRestore();
        setStatus("", "");
        setFieldInvalid(usernameInput, false);
        setFieldInvalid(passwordInput, false);
        usernameInput.value = "";
        passwordInput.value = "";
        setLoading(false);
        window.history.replaceState({}, "", attemptsApi.getIntranetHomeUrl());
        usernameInput.focus();
    }

    function enterPortal(data, credentials) {
        attemptsApi.clearAttempts();
        if (credentials) {
            writeAuthCookie(credentials.username, credentials.password);
        }

        try {
            if (window.OraclePortal && typeof window.OraclePortal.start === "function") {
                window.OraclePortal.start(data);
            }
        } finally {
            hideSkeletonRestore();
            passwordInput.value = "";
            setLoading(false);
        }
    }

    function denyAccess() {
        attemptsApi.incrementAttempts();

        if (attemptsApi.isLockedOut()) {
            window.location.href = attemptsApi.getIntranetAlertUrl();
            return;
        }

        setLoading(false);
        setStatus("Access denied. Invalid credentials or insufficient clearance.", "error");
        shake();
        passwordInput.value = "";
        passwordInput.focus();
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (redirectIfLockedOut()) return;

        if (!validateForm()) {
            (usernameInput.value.trim() ? passwordInput : usernameInput).focus();
            return;
        }

        setLoading(true);
        setStatus("Verifying credentials…");

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        try {
            const result = await loginRequest(username, password);

            if (result.ok) {
                enterPortal(result.data, { username, password });
                return;
            }

            if (result.denied) {
                denyAccess();
                return;
            }
        } catch (err) {
            setLoading(false);
            setStatus("Unable to reach the authentication service. Please try again.", "error");
            shake();
        }
    });

    async function tryRestoreSession() {
        const saved = readAuthCookie();
        if (!saved) {
            hideSkeletonRestore();
            return;
        }

        showSkeletonRestore();

        try {
            const result = await loginRequest(saved.username, saved.password);

            if (result.ok) {
                enterPortal(result.data, saved);
                return;
            }

            if (result.denied) {
                clearAuthCookie();
            }
        } catch (err) {
            // Keep the cookie when offline so a refresh can retry.
        }

        if (redirectIfLockedOut()) return;

        hideSkeletonRestore();
    }

    if (params.get("reset") === "1") {
        attemptsApi.clearAttempts();
        clearAuthCookie();
        window.history.replaceState({}, "", attemptsApi.getIntranetHomeUrl());
    }

    if (params.get("reset") !== "1") {
        if (readAuthCookie()) {
            tryRestoreSession();
        } else if (redirectIfLockedOut()) {
        } else {
            hideSkeletonRestore();
        }
    } else {
        hideSkeletonRestore();
    }
});

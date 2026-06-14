function ensureInfoModal() {
    if (document.getElementById("info-modal")) return;

    const site = window.ORACLE_DATA?.site?.site;
    const storeUrl = site?.defaultBetUrl ?? "https://crestconomy.com/guild/oracle/store";
    const eventUrl = site?.eventUrl ?? "https://crestconomy.com/guild/oracle";
    const tagline = site?.tagline ?? "A prediction market for the Crestconomy civilisation event.";

    document.body.insertAdjacentHTML("beforeend", `
<div id="info-modal" class="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-modal-title" hidden>
    <div class="info-modal-backdrop" data-info-modal-close></div>
    <div class="info-modal-panel">
        <button type="button" class="info-modal-close" id="info-modal-close" data-info-modal-close aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
        <h2 class="info-modal-title" id="info-modal-title">How Oracle works</h2>
        <p class="info-modal-lead">${tagline}</p>
        <div class="info-modal-body">
            <section class="info-modal-section">
                <h3>What is Oracle?</h3>
                <p>Oracle is a prediction market for Crestconomy. Each market is a question about something that may happen during the civilisation event. You buy into the outcome you think is most likely, and earn money if you're right.</p>
            </section>
            <section class="info-modal-section">
                <h3>How to place a bet</h3>
                <ol class="info-modal-steps">
                    <li>Browse markets and pick one you have a view on.</li>
                    <li>Click <strong>Yes</strong>, <strong>No</strong>, or <strong>Bet</strong> on the outcome you want.</li>
                    <li>Copy the search term shown and open the <a href="${storeUrl}" target="_blank" rel="noopener noreferrer">Oracle store</a>.</li>
                    <li>Search for that listing, enter how much you want to bet, and then purchase it. You should then see your bet update the Oracle website in real-time.</li>
                </ol>
            </section>
            <section class="info-modal-section">
                <h3>How markets resolve</h3>
                <p>Every market has an end date. Once the real outcome is known, the market is marked <strong>Resolved</strong> and the winning outcome is shown.</p>
            </section>
            <section class="info-modal-section">
                <h3>How payouts are calculated</h3>
                <p>Oracle uses a pool-based system. Every bet goes into that outcome's pool, and the <strong>total pool</strong> is the sum across all outcomes. When a market resolves, the entire total pool (minus a small house cut) is split among everyone who bet on the winning outcome, in proportion to how much each person put in.</p>
                <p class="info-modal-formula">Your payout = your bet × (total pool ÷ winning outcome pool)</p>
                <p>For example, if the total pool is <strong>100 Bedro</strong> and the winning outcome's pool is <strong>25 Bedro</strong>, a <strong>10 Bedro</strong> bet on that outcome pays out <strong>40 Bedro</strong>, your share of the winner's pool (10 ÷ 25) times the full pot. Bets on losing outcomes receive nothing.</p>
                <p>The percentages shown on this site are each outcome's share of the total pool at that moment. Your actual payout is based on the pool sizes when the market resolves, so later bets on the same side can change what everyone wins.</p>
            </section>
            <section class="info-modal-section">
                <h3>Using this site</h3>
                <ul class="info-modal-list">
                    <li>Use the category tabs and tag filters to find markets relevant to you.</li>
                    <li>Click a market card to see full details, price history, and related news.</li>
                    <li>Check the <strong>Resolved</strong> tab for markets that have already ended.</li>
                    <li>Visit the <strong>Lottery</strong> to participate in daily draws and the <strong>Leaderboard</strong> to see top predictors.</li>
                </ul>
            </section>
        </div>
        <a class="info-modal-link-btn" href="${eventUrl}" target="_blank" rel="noopener noreferrer">
            Learn more about the event
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
        </a>
    </div>
</div>`);
}

function openInfoModal() {
    const modal = document.getElementById("info-modal");
    if (!modal) return;

    modal.hidden = false;
    document.body.classList.add("info-modal-open");
    document.getElementById("info-modal-close")?.focus();
}

function closeInfoModal() {
    const modal = document.getElementById("info-modal");
    if (!modal) return;

    modal.hidden = true;
    document.body.classList.remove("info-modal-open");
}

function bindInfoModal() {
    ensureInfoModal();

    document.getElementById("info-btn")?.addEventListener("click", openInfoModal);

    document.getElementById("info-modal")?.addEventListener("click", (e) => {
        if (e.target.closest("[data-info-modal-close]")) closeInfoModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape" || !document.body.classList.contains("info-modal-open")) return;
        if (document.body.classList.contains("bet-modal-open") || document.body.classList.contains("market-modal-open")) return;
        closeInfoModal();
    });
}

document.addEventListener("DOMContentLoaded", bindInfoModal);

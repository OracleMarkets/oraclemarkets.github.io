window.LOTTERY_DATA = {"pot":0,"entryUrl":"https://crestconomy.com/guild/oracle/store","currentLottery":"Oracle Daily Lottery Ticket | Day 6","history":[{"date":"Day 5","pot":464,"winner":"RomanRodri"},{"date":"Day 4","pot":210,"winner":"Cyborg_Chris"},{"date":"Day 3","pot":180,"winner":"Dugnaldo"},{"date":"Day 2","pot":63,"winner":"Mikrowave"}]};
window.__ORACLE_LOTTERY_POOL_PROMISE__ = (() => {
    const url = window.ORACLE_DATA?.site?.site?.lotteryApiUrl;
    if (!url) return Promise.reject(new Error("lotteryApiUrl not configured"));
    return fetch(url)
        .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch lottery pool: " + response.status);
            return response.json();
        })
        .then((data) => ({
            totalPool: data.totalPool ?? 0,
            ticketCount: data.ticketCount ?? 0,
            currentLottery: data.currentLottery ?? null,
            lastUpdated: data.lastUpdated ?? null
        }));
})();
window.LOTTERY_DATA = {"pot":0,"entryUrl":"https://crestconomy.com/guild/oracle/store","currentLottery":"Oracle Daily Lottery Ticket | Day 2","history":[]};
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
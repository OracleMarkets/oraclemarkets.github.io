$site = Get-Content -Raw "data\data.json" | ConvertFrom-Json
$news = Get-Content -Raw "data\news.json" | ConvertFrom-Json
$marketDefs = Get-Content -Raw "data\markets.json" | ConvertFrom-Json
$currencies = Get-Content -Raw "data\currencies.json" | ConvertFrom-Json

$bundle = [ordered]@{
    site = $site
    news = $news
    marketDefs = $marketDefs
    currencies = $currencies
}

$ammPools = @()
try {
    $ammBody = '{"query":"query CrestGql($path: String!) { api(method: \"GET\", path: $path) }","variables":{"path":"/v1/amm/pools"}}'
    $ammResponse = Invoke-RestMethod -Uri "https://api.crestconomy.com/graphql" -Method Post -ContentType "application/json" -Body $ammBody
    if ($ammResponse.data.api) {
        $ammPools = $ammResponse.data.api
    }
} catch {
    Write-Warning "AMM pools fetch failed: $_"
}

$ammPoolsJson = $ammPools | ConvertTo-Json -Depth 20 -Compress
if (-not $ammPoolsJson) { $ammPoolsJson = "[]" }

$json = $bundle | ConvertTo-Json -Depth 100 -Compress
$content = @"
window.ORACLE_DATA = $json;
window.__ORACLE_AMM_POOLS_PROMISE__ = Promise.resolve({ pools: $ammPoolsJson });
window.__ORACLE_MARKETS_POOLS_PROMISE__ = (() => {
    const base = window.ORACLE_DATA?.site?.site?.marketsApiUrl;
    if (!base) return Promise.reject(new Error("marketsApiUrl not configured"));
    const url = new URL(base);
    url.searchParams.set("status", "active");
    return fetch(url.href)
        .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch market pools: " + response.status);
            return response.json();
        })
        .then((data) => ({ pools: data.pools ?? [] }));
})();
"@
[System.IO.File]::WriteAllText("$PSScriptRoot\data\site-data.js", $content)

$leaderboard = Get-Content -Raw "data\leaderboard.json" | ConvertFrom-Json
$lbJson = $leaderboard | ConvertTo-Json -Depth 100 -Compress
$lbContent = "window.LEADERBOARD_DATA = $lbJson;`n"
[System.IO.File]::WriteAllText("$PSScriptRoot\data\leaderboard-data.js", $lbContent)

$lottery = Get-Content -Raw "data\lottery.json" | ConvertFrom-Json
$lotJson = $lottery | ConvertTo-Json -Depth 100 -Compress
$lotContent = @"
window.LOTTERY_DATA = $lotJson;
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
"@
[System.IO.File]::WriteAllText("$PSScriptRoot\data\lottery-data.js", $lotContent)

Write-Host "Built data\site-data.js"
Write-Host "Built data\leaderboard-data.js"
Write-Host "Built data\lottery-data.js"

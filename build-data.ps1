$site = Get-Content -Raw "data\data.json" | ConvertFrom-Json
$news = Get-Content -Raw "data\news.json" | ConvertFrom-Json
$marketDefs = Get-Content -Raw "data\markets.json" | ConvertFrom-Json
$marketPools = Get-Content -Raw "data\market-pools.json" | ConvertFrom-Json

$bundle = [ordered]@{
    site = $site
    news = $news
    marketDefs = $marketDefs
    marketPools = $marketPools
}

$json = $bundle | ConvertTo-Json -Depth 100 -Compress
$content = "window.ORACLE_DATA = $json;`n"
[System.IO.File]::WriteAllText("$PSScriptRoot\data\site-data.js", $content)

$leaderboard = Get-Content -Raw "data\leaderboard.json" | ConvertFrom-Json
$lbJson = $leaderboard | ConvertTo-Json -Depth 100 -Compress
$lbContent = "window.LEADERBOARD_DATA = $lbJson;`n"
[System.IO.File]::WriteAllText("$PSScriptRoot\data\leaderboard-data.js", $lbContent)

$lottery = Get-Content -Raw "data\lottery.json" | ConvertFrom-Json
$lotJson = $lottery | ConvertTo-Json -Depth 100 -Compress
$lotContent = "window.LOTTERY_DATA = $lotJson;`n"
[System.IO.File]::WriteAllText("$PSScriptRoot\data\lottery-data.js", $lotContent)

Write-Host "Built data\site-data.js"
Write-Host "Built data\leaderboard-data.js"
Write-Host "Built data\lottery-data.js"

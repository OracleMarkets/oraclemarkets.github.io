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

Write-Host "Built data\site-data.js"

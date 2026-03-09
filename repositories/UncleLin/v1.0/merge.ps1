$ErrorActionPreference = "Stop"

$htmlPath = "index.html"
$cssPath = "style.css"
$jsPath = "game.js"
$outPath = "1_UncleLin_Mobile.html"

$htmlRaw = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$cssRaw = [System.IO.File]::ReadAllText($cssPath, [System.Text.Encoding]::UTF8)
$jsRaw = [System.IO.File]::ReadAllText($jsPath, [System.Text.Encoding]::UTF8)

$cssBlock = "<style>`n$cssRaw`n</style>"
$jsBlock = "<script>`n$jsRaw`n</script>"

$htmlRaw = $htmlRaw.Replace('<link rel="stylesheet" href="style.css">', $cssBlock)
$htmlRaw = $htmlRaw.Replace('<script src="game.js"></script>', $jsBlock)

[System.IO.File]::WriteAllText($outPath, $htmlRaw, [System.Text.Encoding]::UTF8)
Write-Output "Successfully merged to $outPath"

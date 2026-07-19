# PWA/바로가기용 앱 아이콘 생성 (외부 도구 없이 .NET GDI+로 직접 그림)
Add-Type -AssemblyName System.Drawing

$root = "c:\Users\orang\Downloads\KBL_MASTER"
$iconDir = Join-Path $root "icons"
New-Item -ItemType Directory -Force $iconDir | Out-Null

$navy = [System.Drawing.Color]::FromArgb(255, 0x00, 0x0d, 0x3d)
$navy2 = [System.Drawing.Color]::FromArgb(255, 0x0e, 0x14, 0x30)
$orange = [System.Drawing.Color]::FromArgb(255, 0xff, 0x5a, 0x1f)
$white = [System.Drawing.Color]::White

function New-Icon([int]$size, [string]$path) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
    $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, $navy, $navy2, 90.0)
    $g.FillRectangle($brush, $rect)

    $fontSize = [single]([int]($size * 0.34))
    $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = [System.Drawing.SolidBrush]::new($white)
    $text = "KBL"
    $textSize = $g.MeasureString($text, $font)
    $tx = [single](($size - $textSize.Width) / 2)
    $ty = [single]($size * 0.16)
    $g.DrawString($text, $font, $whiteBrush, $tx, $ty)

    $lineY = [single]($ty + $textSize.Height + ($size * 0.03))
    $lineW = [single]($size * 0.4)
    $lineX = [single](($size - $lineW) / 2)
    $pen = [System.Drawing.Pen]::new($orange, [single]([Math]::Max(4, $size * 0.03)))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen, $lineX, $lineY, ($lineX + $lineW), $lineY)

    $subFontSize = [single]([int]($size * 0.075))
    $subFont = [System.Drawing.Font]::new("Arial", $subFontSize, [System.Drawing.FontStyle]::Bold)
    $subText = "MANAGER"
    $subSize = $g.MeasureString($subText, $subFont)
    $sx = [single](($size - $subSize.Width) / 2)
    $sy = [single]($lineY + ($size * 0.05))
    $g.DrawString($subText, $subFont, $whiteBrush, $sx, $sy)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose()
}

New-Icon 512 (Join-Path $iconDir "icon-512.png")
New-Icon 192 (Join-Path $iconDir "icon-192.png")
New-Icon 32 (Join-Path $iconDir "favicon-32.png")

# 바탕화면 바로가기용 .ico (256x256 비트맵을 아이콘 핸들로 변환해 저장)
$icoSize = 256
$icoPngPath = Join-Path $iconDir "_ico-src.png"
New-Icon $icoSize $icoPngPath
$srcBmp = [System.Drawing.Bitmap]::new($icoPngPath)
$hIcon = $srcBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoPath = Join-Path $iconDir "app.ico"
$fs = [System.IO.FileStream]::new($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$srcBmp.Dispose()
Remove-Item $icoPngPath -Force

Write-Output "아이콘 생성 완료: $iconDir"

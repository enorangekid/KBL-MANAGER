# KBL 매니저 로컬 정적 파일 서버
# PWA 설치/설치된 앱 실행은 http:// 출처가 필요해서(file://는 설치 불가) 이 서버로 로컬에서 서빙한다.
param([int]$Port = 8791)

$root = $PSScriptRoot
$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".webp" = "image/webp"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".ttf"  = "font/ttf"
  ".otf"  = "font/otf"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
}

$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "KBL 매니저 로컬 서버 시작: $prefix"
Write-Output "이 창을 닫으면 서버가 종료됩니다. (Ctrl+C로도 종료 가능)"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    try {
      $reqPath = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      if ($reqPath -eq "/") { $reqPath = "/index.html" }
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $reqPath.TrimStart("/")))
      if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
      } elseif (-not (Test-Path $full -PathType Leaf)) {
        $res.StatusCode = 404
      } else {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ct = $mime[$ext]
        if (-not $ct) { $ct = "application/octet-stream" }
        $res.ContentType = $ct
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.Close()
    }
  }
} finally {
  $listener.Stop()
}

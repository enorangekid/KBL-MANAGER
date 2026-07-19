# 에디터용 데이터 생성: 원본(프로필+히든) + V6.2 확정본(능력치/OVR) -> editor/players_data.js
$Source = "c:\Users\orang\Downloads\KBL_MASTER\KBL_통합스탯_2.xlsx"
$Ratings = "c:\Users\orang\Downloads\KBL_MASTER\outputs\kbl_ratings_v6\KBL_10팀_능력치_확정본_V6.2.xlsx"
$OutJs = "c:\Users\orang\Downloads\KBL_MASTER\editor\players_data.js"

$TEAMS = @("원주 DB","서울 삼성","고양 소노","서울 SK","창원 LG","안양 정관장","수원 KT","대구 한국가스공사","울산 현대 모비스","부산 KCC")
$PROFILE_COLS = [ordered]@{선수=1;선수ID=2;생년월일=3;국적=4;출생지=5;'출신 대학'=6;신장=7;체중=8;윙스팬=9;포지션=10;연봉=11;계약기간=12;병역=13}
$HIDDEN_COLS = [ordered]@{현재능력=14;잠재능력=15;팀워크=16;리더십=17;체력=18;활동량=19;꾸준함=20;큰경기=21;부상빈도=22;프로의식=23;야망=24;충성도=25;자존감=26;강심장=27;더티플레이=28}
$ATTRS = @("근거리슛","드라이빙레이업","드라이빙덩크","스탠딩덩크","포스트컨트롤","중거리슛","3점슛","자유투","패스정확도","볼핸들링","스틸","블록","공격리바운드","수비리바운드","골밑수비","외곽수비","드리블속도","속도","민첩성","힘","점프력","체력")

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

# 1) 확정본에서 능력치 읽기 (팀|선수 -> attrs)
$wbR = $excel.Workbooks.Open($Ratings, $null, $true)
$ratingMap = @{}
foreach ($team in $TEAMS) {
    $ws = $wbR.Worksheets.Item($team)
    $hdrs = @{}
    $cols = $ws.UsedRange.Columns.Count
    for ($c=1; $c -le $cols; $c++) { $h = $ws.Cells.Item(1,$c).Text; if ($h) { $hdrs[$h] = $c } }
    $rows = $ws.UsedRange.Rows.Count
    for ($r=2; $r -le $rows; $r++) {
        $name = $ws.Cells.Item($r,1).Text.Trim()
        if (-not $name) { continue }
        $rec = @{}
        foreach ($a in $ATTRS) { $rec[$a] = [int]$ws.Cells.Item($r,$hdrs[$a]).Value2 }
        $rec['OVR'] = [int]$ws.Cells.Item($r,$hdrs['OVR']).Value2
        $rec['주포지션'] = $ws.Cells.Item($r,$hdrs['주포지션']).Text
        $ratingMap["$team|$name"] = $rec
    }
}
$wbR.Close($false)

# 2) 원본에서 프로필/히든/GP/MIN 읽고 병합
$wbS = $excel.Workbooks.Open($Source, $null, $true)
$players = New-Object System.Collections.Generic.List[object]
foreach ($team in $TEAMS) {
    $ws = $wbS.Worksheets.Item($team)
    $rows = $ws.UsedRange.Rows.Count
    for ($r=2; $r -le $rows; $r++) {
        $name = $ws.Cells.Item($r,1).Text.Trim()
        if (-not $name) { continue }
        $p = [ordered]@{ 팀 = $team }
        foreach ($k in $PROFILE_COLS.Keys) { $p[$k] = $ws.Cells.Item($r,$PROFILE_COLS[$k]).Text }
        $hidden = [ordered]@{}
        foreach ($k in $HIDDEN_COLS.Keys) { $hidden[$k] = $ws.Cells.Item($r,$HIDDEN_COLS[$k]).Text }
        $p['히든'] = [PSCustomObject]$hidden
        $p['GP'] = $ws.Cells.Item($r,29).Text
        $p['MIN'] = $ws.Cells.Item($r,32).Text
        $key = "$team|$name"
        if ($ratingMap.ContainsKey($key)) {
            $rec = $ratingMap[$key]
            $p['주포지션'] = $rec['주포지션']
            $p['OVR'] = $rec['OVR']
            $attrsObj = [ordered]@{}
            foreach ($a in $ATTRS) { $attrsObj[$a] = $rec[$a] }
            $p['능력치'] = [PSCustomObject]$attrsObj
        } else {
            $p['주포지션'] = "SG"; $p['OVR'] = 60
            $attrsObj = [ordered]@{}
            foreach ($a in $ATTRS) { $attrsObj[$a] = 50 }
            $p['능력치'] = [PSCustomObject]$attrsObj
        }
        $players.Add([PSCustomObject]$p)
    }
}
$wbS.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

$null = New-Item -ItemType Directory -Force (Split-Path $OutJs)
$json = $players.ToArray() | ConvertTo-Json -Depth 6
$js = "// 자동 생성: tools/export_editor_data.ps1`nconst TEAMS = " + (ConvertTo-Json $TEAMS -Compress) + ";`nconst PLAYERS_DATA = " + $json + ";`n"
[System.IO.File]::WriteAllText($OutJs, $js, (New-Object System.Text.UTF8Encoding $false))
Write-Output "선수 $($players.Count)명 -> $OutJs"
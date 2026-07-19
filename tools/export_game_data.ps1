# 게임용 로스터 생성: editor/players_final.json -> data/game_players.js
$root = "c:\Users\orang\Downloads\KBL_MASTER"
$json = Get-Content "$root\editor\players_final.json" -Raw -Encoding UTF8 | ConvertFrom-Json

# 에디터 팀명 -> 게임 팀 id
$TEAM_IDS = @{
 "원주 DB"="db"; "서울 삼성"="samsung"; "고양 소노"="sono"; "서울 SK"="sk"; "창원 LG"="lg";
 "안양 정관장"="redboosters"; "수원 KT"="kt"; "대구 한국가스공사"="kogas"; "울산 현대 모비스"="mobis"; "부산 KCC"="kcc"
}

# 공격/수비 OVR: 종합 OVR과 동일한 스케일 (포지션 가중치 -> 1.25x(raw+보정)-16)
$WEIGHTS = @{
 PG = @{"패스정확도"=1.9;"볼핸들링"=1.8;"3점슛"=1.25;"자유투"=0.65;"스틸"=1.15;"외곽수비"=1.25;"속도"=1.15;"민첩성"=1.1;"체력"=0.8;"드라이빙레이업"=0.95;"중거리슛"=0.65;"근거리슛"=0.45;"수비리바운드"=0.25;"골밑수비"=0.2}
 SG = @{"3점슛"=1.75;"중거리슛"=1.1;"드라이빙레이업"=1.0;"볼핸들링"=1.1;"패스정확도"=0.95;"스틸"=1.05;"외곽수비"=1.2;"속도"=1.0;"민첩성"=1.0;"체력"=0.75;"자유투"=0.65;"근거리슛"=0.55;"수비리바운드"=0.35}
 SF = @{"3점슛"=1.4;"중거리슛"=1.2;"드라이빙레이업"=1.0;"근거리슛"=0.7;"수비리바운드"=1.0;"스틸"=0.9;"외곽수비"=1.2;"골밑수비"=0.6;"힘"=0.6;"속도"=0.7;"점프력"=0.6;"체력"=0.7;"패스정확도"=0.5}
 PF = @{"근거리슛"=1.2;"포스트컨트롤"=1.15;"공격리바운드"=1.15;"수비리바운드"=1.25;"골밑수비"=1.2;"블록"=0.95;"힘"=1.1;"점프력"=0.75;"체력"=0.65;"중거리슛"=0.65;"3점슛"=0.55;"외곽수비"=0.55;"드라이빙덩크"=0.75}
 C  = @{"근거리슛"=1.45;"포스트컨트롤"=1.35;"공격리바운드"=1.25;"수비리바운드"=1.45;"골밑수비"=1.55;"블록"=1.25;"힘"=1.2;"점프력"=0.75;"체력"=0.6;"스탠딩덩크"=0.9;"드라이빙덩크"=0.65;"패스정확도"=0.6;"스틸"=0.45;"3점슛"=0.25;"볼핸들링"=0.2;"외곽수비"=0.35}
}
$POS_ADJ = @{PG=0;SG=4;SF=6;PF=4;C=2}
$OFF_KEYS = @("근거리슛","드라이빙레이업","드라이빙덩크","스탠딩덩크","포스트컨트롤","중거리슛","3점슛","자유투","패스정확도","볼핸들링","드리블속도","공격리바운드")
$DEF_KEYS = @("골밑수비","외곽수비","스틸","블록","수비리바운드")

function Get-SideOvr($attrs, $pos, $keys) {
    $w = $WEIGHTS[$pos]; if (-not $w) { $w = $WEIGHTS['SG'] }
    $sum=0.0; $tot=0.0
    foreach ($k in $w.Keys) {
        if ($keys -notcontains $k) { continue }
        $v = $attrs.$k
        if ($v -eq $null -or "$v" -eq "") { continue }
        $sum += [double]$v * $w[$k]; $tot += $w[$k]
    }
    if ($tot -eq 0) { return $null }
    $adj = $POS_ADJ[$pos]; if ($adj -eq $null) { $adj = 0 }
    return [int][math]::Round([math]::Max(40.0, [math]::Min(99.0, 1.25*($sum/$tot + $adj) - 16)))
}

function Get-Age($birth) {
    $d = [datetime]::MinValue
    if ([datetime]::TryParse("$birth", [ref]$d)) {
        $now = Get-Date
        $age = $now.Year - $d.Year
        if ($now -lt $d.AddYears($age)) { $age-- }
        return $age
    }
    return $null
}

$rosters = [ordered]@{}
foreach ($id in $TEAM_IDS.Values) { $rosters[$id] = New-Object System.Collections.Generic.List[object] }
foreach ($p in $json) {
    $tid = $TEAM_IDS[$p.팀]
    if (-not $tid) { continue }
    $attrs = [ordered]@{}
    foreach ($prop in $p.능력치.PSObject.Properties) { $attrs[$prop.Name] = $prop.Value }
    # 히든 능력치 (0~20 스케일, 빈 값은 제외 -> 게임에서 평균 10으로 처리)
    $hidden = [ordered]@{}
    if ($p.히든) {
        foreach ($prop in $p.히든.PSObject.Properties) {
            if ("$($prop.Value)" -ne "") { $hidden[$prop.Name] = [int]$prop.Value }
        }
    }
    $rosters[$tid].Add([PSCustomObject]@{
        id = $p.선수ID
        name = $p.선수
        pos = $p.주포지션
        subPos = "$($p.보조포지션)"
        ovr = $p.OVR
        atk = (Get-SideOvr $p.능력치 $p.주포지션 $OFF_KEYS)
        def = (Get-SideOvr $p.능력치 $p.주포지션 $DEF_KEYS)
        grade = $p.등급
        age = (Get-Age $p.생년월일)
        birth = "$($p.생년월일)"
        height = $p.신장
        weight = $p.체중
        wingspan = $p.윙스팬
        nationality = $p.국적
        salary = $p.연봉액
        salaryCur = $p.연봉통화
        contractEnd = "$($p.계약종료)"
        attrs = [PSCustomObject]$attrs
        hidden = [PSCustomObject]$hidden
    })
}
# 팀별 OVR 내림차순 정렬
$out = [ordered]@{}
foreach ($id in $rosters.Keys) {
    $out[$id] = @($rosters[$id] | Sort-Object ovr -Descending)
}
$body = [PSCustomObject]$out | ConvertTo-Json -Depth 6
$js = "// 자동 생성: tools/export_game_data.ps1 (원본: editor/players_final.json)`nconst KBL_REAL_ROSTERS = " + $body + ";`n"
$null = New-Item -ItemType Directory -Force "$root\data"
[System.IO.File]::WriteAllText("$root\data\game_players.js", $js, (New-Object System.Text.UTF8Encoding $false))
$total = 0; foreach ($id in $out.Keys) { $total += @($out[$id]).Count }
Write-Output ("게임 데이터 생성: {0}팀 {1}명 -> data\game_players.js" -f $out.Keys.Count, $total)
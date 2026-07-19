# KBL 능력치 산출 V6 (PowerShell 포팅)
# V5(calc_kbl_ratings_v5.py) 공식 기반. V6 변경점:
#  1) DFL/SAST는 원본 오염(행번호)으로 0 처리
#  2) AST/TO 비율 상한 4.0, TO=0 & AST>0이면 상한값 적용
#  3) 윙스팬 결측 시 신장+7로 추정
#  4) GP<15 선수 "표본부족" 표시
param(
    [string[]]$Teams = @("원주 DB"),
    [string]$Source = "c:\Users\orang\Downloads\KBL_MASTER\KBL_통합스탯_2.xlsx",
    [string]$OutFile = "c:\Users\orang\Downloads\KBL_MASTER\outputs\kbl_ratings_v6\KBL_능력치_초안_V6_원주DB.xlsx",
    [string]$Title = "KBL 능력치 초안 V6"
)

$ATTRS = @("근거리슛","드라이빙레이업","드라이빙덩크","스탠딩덩크","포스트컨트롤","중거리슛","3점슛","자유투","패스정확도","볼핸들링","스틸","블록","공격리바운드","수비리바운드","골밑수비","외곽수비","드리블속도","속도","민첩성","힘","점프력","체력")

$OVR_WEIGHTS = @{
 "PG" = @{"패스정확도"=1.9;"볼핸들링"=1.8;"3점슛"=1.25;"자유투"=0.65;"스틸"=1.15;"외곽수비"=1.25;"속도"=1.15;"민첩성"=1.1;"체력"=0.8;"드라이빙레이업"=0.95;"중거리슛"=0.65;"근거리슛"=0.45;"수비리바운드"=0.25;"골밑수비"=0.2}
 "SG" = @{"3점슛"=1.75;"중거리슛"=1.1;"드라이빙레이업"=1.0;"볼핸들링"=1.1;"패스정확도"=0.95;"스틸"=1.05;"외곽수비"=1.2;"속도"=1.0;"민첩성"=1.0;"체력"=0.75;"자유투"=0.65;"근거리슛"=0.55;"수비리바운드"=0.35}
 "SF" = @{"3점슛"=1.4;"중거리슛"=1.2;"드라이빙레이업"=1.0;"근거리슛"=0.7;"수비리바운드"=1.0;"스틸"=0.9;"외곽수비"=1.2;"골밑수비"=0.6;"힘"=0.6;"속도"=0.7;"점프력"=0.6;"체력"=0.7;"패스정확도"=0.5}
 "PF" = @{"근거리슛"=1.2;"포스트컨트롤"=1.15;"공격리바운드"=1.15;"수비리바운드"=1.25;"골밑수비"=1.2;"블록"=0.95;"힘"=1.1;"점프력"=0.75;"체력"=0.65;"중거리슛"=0.65;"3점슛"=0.55;"외곽수비"=0.55;"드라이빙덩크"=0.75}
 "C"  = @{"근거리슛"=1.45;"포스트컨트롤"=1.35;"공격리바운드"=1.25;"수비리바운드"=1.45;"골밑수비"=1.55;"블록"=1.25;"힘"=1.2;"점프력"=0.75;"체력"=0.6;"스탠딩덩크"=0.9;"드라이빙덩크"=0.65;"패스정확도"=0.35;"3점슛"=0.25;"볼핸들링"=0.2;"외곽수비"=0.35}
}

$POSITION_FLOORS = @{
 "PG" = @{"패스정확도"=62;"볼핸들링"=64;"스틸"=52;"외곽수비"=55}
 "SG" = @{"3점슛"=52;"볼핸들링"=54;"스틸"=50;"외곽수비"=53}
 "SF" = @{"외곽수비"=50;"수비리바운드"=48;"힘"=52}
 "PF" = @{"근거리슛"=54;"포스트컨트롤"=52;"공격리바운드"=55;"수비리바운드"=56;"골밑수비"=56;"블록"=52;"힘"=64}
 "C"  = @{"근거리슛"=58;"포스트컨트롤"=58;"공격리바운드"=60;"수비리바운드"=62;"골밑수비"=63;"블록"=60;"힘"=72;"스탠딩덩크"=58}
}

$PHYSICAL_PROFILE = @{
 "PG" = @{h=185;w=80;ws=190;speed=84;agility=86;strength=44;jump=67}
 "SG" = @{h=190;w=86;ws=196;speed=78;agility=80;strength=53;jump=69}
 "SF" = @{h=196;w=94;ws=203;speed=70;agility=72;strength=64;jump=71}
 "PF" = @{h=201;w=103;ws=210;speed=60;agility=62;strength=77;jump=72}
 "C"  = @{h=206;w=112;ws=216;speed=50;agility=52;strength=88;jump=73}
}

function Get-Num($v, $default=0.0) {
    if ($v -eq $null) { return $default }
    $s = "$v".Trim() -replace '%',''
    if ($s -eq "" -or $s -eq "-" -or $s.Contains(":")) { return $default }
    $n = 0.0
    if ([double]::TryParse($s, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$n)) { return $n }
    return $default
}

function Get-Minutes($v) {
    if ($v -eq $null) { return 0.0 }
    $s = "$v".Trim()
    if ($s.Contains(":")) {
        $p = $s -split ':'
        return [double]$p[0] + [double]$p[1]/60.0
    }
    return Get-Num $v
}

function Get-Rating([double]$value, [double]$low=30, [double]$high=97) {
    if ($value -gt 90) { $value = 90 + ($value - 90) * 0.45 }
    return [int][math]::Round([math]::Max($low, [math]::Min($high, $value)))
}

function Get-OvrRating([double]$value) {
    return [int][math]::Round([math]::Max(60, [math]::Min(99, $value)))
}

function Get-RatioCapped([double]$a, [double]$b, [double]$cap=4.0) {
    # V6: TO=0인데 AST>0이면 상한값 인정, 비율 상한 4.0
    if ($b -eq 0) { if ($a -gt 0) { return $cap } else { return 0 } }
    return [math]::Min($cap, $a / $b)
}

function Get-SafeDiv([double]$a, [double]$b) {
    if ($b -eq 0) { return 0 }
    return $a / $b
}

function Get-PrimaryPos($pos) {
    $order = @("PG","SG","SF","PF","C")
    if ([string]::IsNullOrWhiteSpace($pos)) { return "SG" }
    $parts = ("$pos" -replace '/','-' -replace '\s','') -split '-' | Where-Object { $order -contains $_ }
    if ($parts.Count -gt 0) { return @($parts)[0] }
    return "SG"
}

function Get-Physical($pos, [double]$height, [double]$weight, [double]$wingspan, [double]$dk, [double]$blk, [double]$oreb, [double]$stl, [double]$gd) {
    $p = $PHYSICAL_PROFILE[$pos]
    $hd = $height - $p.h; $wd = $weight - $p.w; $wsd = $wingspan - $p.ws
    $speed = $p.speed - $hd*0.18 - $wd*0.23 + [math]::Max(0, -$hd)*0.08
    # V6: 민첩성은 체중에 더 민감(0.25→0.30) + 수비 활동량(스틸/굿디펜스) 반영
    $agility = $p.agility - $hd*0.16 - $wd*0.30 + [math]::Max(0, -$hd)*0.10 + $stl*2.2 + $gd*1.5
    $strength = $p.strength + $wd*0.58 + $hd*0.16 + $wsd*0.10
    # V6: 점프력 체중 감점 강화(0.20→0.30) + 절대체중 100kg 초과분 추가 감점
    $jump = $p.jump + $wsd*0.30 + $hd*0.08 - $wd*0.30 - [math]::Max(0, $weight-100)*0.18 + $dk*2.8 + $blk*3.0 + $oreb*1.5
    return @{
        "속도" = Get-Rating $speed 30 95
        "민첩성" = Get-Rating $agility 30 95
        "힘" = Get-Rating $strength 30 97
        "점프력" = Get-Rating $jump 30 95
    }
}

function Get-Age($birthText, [datetime]$asOf) {
    $d = [datetime]::MinValue
    if ([datetime]::TryParse("$birthText", [ref]$d)) {
        $age = $asOf.Year - $d.Year
        if ($asOf -lt $d.AddYears($age)) { $age-- }
        return $age
    }
    return 27  # 결측 시 전성기 나이로 간주
}

function Get-Stamina([double]$minutes, [double]$games, [double]$fouls, $pos, [int]$age) {
    $bonus = @{"PG"=2;"SG"=1;"SF"=0;"PF"=-1;"C"=-2}[$pos]
    # V6: 나이 보정 (경기 소화 능력)
    $ageAdj = 0
    if ($age -le 23) { $ageAdj = 1 }
    elseif ($age -le 29) { $ageAdj = 2 }
    elseif ($age -le 32) { $ageAdj = 0 }
    elseif ($age -le 35) { $ageAdj = -3 }
    else { $ageAdj = -6 }
    # V6.1: 경기 소화 능력이므로 하한 55, 출전시간 계수 축소로 편차 압축 (약 55~93)
    $value = 48 + $minutes*1.05 + [math]::Min($games,54)*0.15 - $fouls*1.2 + $bonus + $ageAdj
    if ($minutes -ge 30) { $value += 3 } elseif ($minutes -ge 24) { $value += 1.5 } elseif ($minutes -lt 10) { $value -= 2 }
    return Get-Rating $value 55 95
}

function Get-PlayerRating($row) {
    $pos = Get-PrimaryPos $row.포지션
    $height = Get-Num $row.신장 195
    $weight = Get-Num $row.체중 95
    $wingspan = Get-Num $row.윙스팬 0
    if ($wingspan -eq 0) { $wingspan = $height + 7 }   # V6: 결측 시 신장+7

    $pts = Get-Num $row.PTS; $twoPM = Get-Num $row.'2PM'; $twoPct = Get-Num $row.'2P%'
    $threePM = Get-Num $row.'3PM'; $threePA = Get-Num $row.'3PA'; $threePct = Get-Num $row.'3P%'
    $ftm = Get-Num $row.FTM; $fta = Get-Num $row.FTA; $ftPct = Get-Num $row.'FT%'
    $oreb = Get-Num $row.OREB; $dreb = Get-Num $row.DREB; $reb = Get-Num $row.REB
    $ast = Get-Num $row.AST; $stl = Get-Num $row.STL; $blk = Get-Num $row.BLK
    $gd = Get-Num $row.GD; $dk = Get-Num $row.DK; $dka = Get-Num $row.DKA; $to = Get-Num $row.TO
    $pp = Get-Num $row.PP; $ppa = Get-Num $row.PPA; $ppPct = Get-Num $row.'PP%'
    $fgPct = Get-Num $row.'FG%'; $gp = Get-Num $row.GP; $pf = Get-Num $row.PF
    $sast = 0.0; $dfl = 0.0   # V6: 오염 컬럼 무시
    $minutes = Get-Minutes $row.MIN

    $midEst = [math]::Max(0, $pts - $twoPM*2 - $threePM*3 - $ftm)
    $sizeBonus = ($height-195)*0.45 + ($wingspan-200)*0.28
    $guardBonus = 0; if ($pos -eq "PG" -or $pos -eq "SG") { $guardBonus = 6 }
    $bigBonus = 0; if ($pos -eq "PF" -or $pos -eq "C") { $bigBonus = 7 }
    $wingGuardBonus = 0; if ($pos -in @("PG","SG","SF")) { $wingGuardBonus = 1 }

    # V6 순서: ① 피지컬 확정 → ② 스킬/수비 능력치가 피지컬을 참조
    $phys = Get-Physical $pos $height $weight $wingspan $dk $blk $oreb $stl $gd
    $age = Get-Age $row.생년월일 ([datetime]"2025-01-01")
    $phys["체력"] = Get-Stamina $minutes $gp $pf $pos $age
    $dunkPosBonus = @{"PG"=-7;"SG"=-2;"SF"=4;"PF"=7;"C"=5}[$pos]
    $standingPosBonus = @{"PG"=-12;"SG"=-7;"SF"=0;"PF"=10;"C"=14}[$pos]
    $astToRatio = Get-RatioCapped $ast $to 4.0

    $attrs = @{}
    # V6.2: 슛 계열 포지션 보정 — 기록 스탯이 기본, 포지션 상수는 그 위에 가감
    $nearPosAdj = @{"PG"=0;"SG"=0;"SF"=2;"PF"=6;"C"=8}[$pos]
    $layupPosAdj = @{"PG"=6;"SG"=5;"SF"=2;"PF"=-4;"C"=-7}[$pos]
    $threePosAdj = @{"PG"=5;"SG"=6;"SF"=2;"PF"=-3;"C"=-7}[$pos]
    # V6.2: 근거리슛 전체 상향(기본 36→40) + 빅맨일수록 가산
    $attrs["근거리슛"] = Get-Rating (40 + $twoPct*0.20 + $ppPct*0.10 + $ppa*0.9 + $twoPM*1.4 + $nearPosAdj)
    $attrs["드라이빙레이업"] = Get-Rating (43 + $twoPct*0.33 + $pts*0.9 + $stl*2.4 + $layupPosAdj)
    # V6.1: 덩크 하향. 드라이빙덩크는 스피드 60 미만 시 추가 감점(느리면 불가)
    $attrs["드라이빙덩크"] = Get-Rating (24 + $dk*4.5 + (Get-SafeDiv $dk $dka)*6 + $phys["속도"]*0.24 + $phys["점프력"]*0.26 - [math]::Max(0, 60-$phys["속도"])*0.5 + [math]::Max(0,$sizeBonus)*0.25 + $dunkPosBonus)
    $attrs["스탠딩덩크"] = Get-Rating (26 + $dk*3.5 + $blk*3.0 + $phys["힘"]*0.22 + $phys["점프력"]*0.20 + [math]::Max(0,$sizeBonus)*0.5 + $standingPosBonus)
    $attrs["포스트컨트롤"] = Get-Rating (38 + $ppPct*0.21 + $pp*1.1 + $reb*1.6 + $twoPM*1.8 + $bigBonus)
    # V6.1: 중거리슛 재설계 — 기존 추정중거리득점(midEst)은 정의상 항상 0에 수렴하는 결함.
    #        슛터치 지표인 FT%와 2P%, 득점 볼륨으로 추정
    # V6.2: 포지션 보정 세분화 — 미드레인지는 가드·윙의 무기, 센터일수록 하락
    $midPosAdj = @{"PG"=4;"SG"=5;"SF"=2;"PF"=-4;"C"=-8}[$pos]
    $attrs["중거리슛"] = Get-Rating (38 + $twoPct*0.25 + $ftPct*0.25 + $pts*0.30 + $midPosAdj)
    $attrs["3점슛"] = Get-Rating (38 + $threePct*0.55 + $threePM*5.8 + $threePA*1.35 + $threePosAdj)
    $attrs["자유투"] = Get-Rating (42 + $ftPct*0.46 + $fta*0.75)
    $passPosBonus = 0; if ($pos -eq "PG") { $passPosBonus = 8 } elseif ($pos -eq "SG") { $passPosBonus = 3 }
    $attrs["패스정확도"] = Get-Rating (42 + $ast*8.0 + $astToRatio*4.0 + $sast*1.5 + $passPosBonus)
    $attrs["볼핸들링"] = Get-Rating (43 + $ast*4.2 + $astToRatio*5.5 + $stl*3.0 + $guardBonus)
    # V6: 스틸/블록 계수 상향(KBL 낮은 절대치 보정) + 피지컬 연동
    $stlPosBonus = @{"PG"=7;"SG"=6;"SF"=3;"PF"=0;"C"=0}[$pos]
    $attrs["스틸"] = Get-Rating (43 + $stl*14.0 + $gd*1.5 + ($phys["민첩성"]-60)*0.25 + $stlPosBonus)
    $blkPosBonus = @{"PG"=0;"SG"=0;"SF"=2;"PF"=6;"C"=8}[$pos]
    $attrs["블록"] = Get-Rating (36 + $blk*24.0 + $dreb*0.8 + ($phys["점프력"]-60)*0.20 + ($wingspan-200)*0.35 + $blkPosBonus)
    # V6.1: 공격리바운드 상향
    $attrs["공격리바운드"] = Get-Rating (42 + $oreb*11.0 + $reb*0.7 + $sizeBonus*0.5 + $bigBonus)
    $attrs["수비리바운드"] = Get-Rating (38 + $dreb*6.5 + $blk*1.7 + $sizeBonus*0.40 + $bigBonus)
    # V6.1: 골밑수비 기본값 상향 + 계수 축소 + 하한 40으로 편차 압축
    $inDefPosBonus = @{"PG"=0;"SG"=0;"SF"=2;"PF"=7;"C"=10}[$pos]
    $attrs["골밑수비"] = Get-Rating (44 + $blk*6.5 + $dreb*1.4 + $gd*2.0 + ($phys["힘"]-60)*0.25 + ($height-195)*0.30 + ($wingspan-200)*0.20 + $inDefPosBonus) 40 97
    # V6.1: 외곽수비 기본값·민첩성 반영 상향
    $outDefPosBonus = @{"PG"=10;"SG"=8;"SF"=5;"PF"=0;"C"=-3}[$pos]
    $attrs["외곽수비"] = Get-Rating (45 + $stl*7.0 + $gd*3.0 + ($phys["민첩성"]-60)*0.40 + ($phys["속도"]-60)*0.15 + $outDefPosBonus)
    foreach ($k in $phys.Keys) { $attrs[$k] = $phys[$k] }
    # V6: 드리블속도 = 스피드 + 민첩성 + 볼핸들링 혼합 (피지컬 확정 후 산출)
    $wbPenalty = 0
    if ($pos -eq "PF" -or $pos -eq "C") { $wbPenalty = 4 } elseif ($pos -eq "SF") { $wbPenalty = 2 }
    $attrs["드리블속도"] = Get-Rating ($phys["속도"]*0.55 + $phys["민첩성"]*0.15 + $attrs["볼핸들링"]*0.30 - $wbPenalty) 30 95

    # 포지션 하한
    foreach ($k in $POSITION_FLOORS[$pos].Keys) {
        $floor = $POSITION_FLOORS[$pos][$k]
        if ($attrs[$k] -lt $floor) { $attrs[$k] = $floor }
    }

    $usage = [math]::Min(8, [math]::Max(0, ($minutes-10)*0.28)) + [math]::Min(3, [math]::Max(0, ($gp-20)*0.05))
    # V6.3: 포지션 캘리브레이션 - 가중치 구조상 포워드가 저평가되는 것을 보정
    $ovrPosAdj = @{"PG"=0;"SG"=1;"SF"=5;"PF"=3;"C"=0}[$pos]
    $w = $OVR_WEIGHTS[$pos]
    $wsum = 0.0; $wtot = 0.0
    foreach ($k in $w.Keys) {
        $av = 50; if ($attrs.ContainsKey($k)) { $av = $attrs[$k] }
        $wsum += $av * $w[$k]; $wtot += $w[$k]
    }
    $ovr = Get-OvrRating ($wsum/$wtot + $usage + $ovrPosAdj)

    $grade = "예비/신인급"
    if ($ovr -ge 95) { $grade = "MVP급" } elseif ($ovr -ge 90) { $grade = "시즌베스트급" } elseif ($ovr -ge 80) { $grade = "주전라인업급" } elseif ($ovr -ge 75) { $grade = "로테이션급" } elseif ($ovr -ge 70) { $grade = "후보급" }
    $note = ""; if ($gp -lt 15) { $note = "표본부족(GP<15)" }

    return [PSCustomObject]@{
        선수=$row.선수; 포지션=$row.포지션; 주포지션=$pos; OVR=$ovr; 등급=$grade; 비고=$note
        신장=$height; 체중=$weight; 윙스팬=$wingspan; GP=$gp; MIN=$row.MIN; Attrs=$attrs
    }
}

# ===== 메인 =====
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$src = $excel.Workbooks.Open($Source, $null, $true)

$COLS = @{선수=1;생년월일=3;신장=7;체중=8;윙스팬=9;포지션=10;GP=29;W=30;L=31;MIN=32;PTS=33;'2PM'=34;'2PA'=35;'2P%'=36;'3PM'=37;'3PA'=38;'3P%'=39;FGM=40;FGA=41;'FG%'=42;FTM=43;FTA=44;'FT%'=45;OREB=46;DREB=47;REB=48;AST=49;STL=50;BLK=51;GD=52;DK=53;DKA=54;TO=55;PF=56;PP=57;PPA=58;'PP%'=59}

$resultsByTeam = [ordered]@{}
foreach ($team in $Teams) {
    $ws = $src.Worksheets.Item($team)
    $rows = $ws.UsedRange.Rows.Count
    $players = @()
    for ($r=2; $r -le $rows; $r++) {
        $name = $ws.Cells.Item($r,1).Text
        if ([string]::IsNullOrWhiteSpace($name)) { continue }
        $obj = @{}
        foreach ($k in $COLS.Keys) {
            if ($k -eq '선수' -or $k -eq 'MIN' -or $k -eq '포지션' -or $k -eq '생년월일') { $obj[$k] = $ws.Cells.Item($r,$COLS[$k]).Text }
            else { $obj[$k] = $ws.Cells.Item($r,$COLS[$k]).Value2 }
        }
        $obj['선수'] = $obj['선수'].Trim()
        $players += Get-PlayerRating ([PSCustomObject]$obj)
    }
    $resultsByTeam[$team] = @($players | Sort-Object @{E={$_.OVR};Descending=$true}, 선수)
}
$src.Close($false)

# ===== 출력 워크북 =====
$null = New-Item -ItemType Directory -Force (Split-Path $OutFile)
$wb = $excel.Workbooks.Add()

# 요약 시트
$sum = $wb.Worksheets.Item(1)
$sum.Name = "요약"
$sum.Cells.Item(1,1) = $Title
$sum.Range("A1:F1").Merge() | Out-Null
$sum.Range("A1").Font.Bold = $true; $sum.Range("A1").Font.Size = 16
$sum.Range("A1:F1").Interior.Color = 5249798; $sum.Range("A1").Font.Color = 16777215
$sum.Cells.Item(2,1) = "V6: DFL/SAST 제거·AST/TO 상한 | 점프력 체중감점·체력 나이보정·민첩성/볼속 차별화 | 수비·블록·스틸 피지컬 연동"
$sum.Range("A2:F2").Merge() | Out-Null
$sum.Range("A2:F2").Interior.Color = 2054655; $sum.Range("A2").Font.Color = 16777215; $sum.Range("A2").Font.Bold = $true

$hdr = @("팀","선수수","평균 OVR","최고 OVR","최고 선수")
for ($c=0; $c -lt $hdr.Count; $c++) { $sum.Cells.Item(4,$c+1) = $hdr[$c] }
$sum.Range("A4:E4").Font.Bold = $true; $sum.Range("A4:E4").Interior.Color = 5249798; $sum.Range("A4:E4").Font.Color = 16777215
$sr = 5
foreach ($team in $resultsByTeam.Keys) {
    $list = $resultsByTeam[$team]
    $avg = [math]::Round(($list | Measure-Object OVR -Average).Average, 1)
    $sum.Cells.Item($sr,1)=$team; $sum.Cells.Item($sr,2)=$list.Count; $sum.Cells.Item($sr,3)=$avg
    $sum.Cells.Item($sr,4)=$list[0].OVR; $sum.Cells.Item($sr,5)=$list[0].선수
    $sr++
}
$gr = $sr + 2
$sum.Cells.Item($gr,1)="등급"; $sum.Cells.Item($gr,2)="OVR 범위"
$sum.Range($sum.Cells.Item($gr,1),$sum.Cells.Item($gr,2)).Font.Bold = $true
$sum.Range($sum.Cells.Item($gr,1),$sum.Cells.Item($gr,2)).Interior.Color = 5249798
$sum.Range($sum.Cells.Item($gr,1),$sum.Cells.Item($gr,2)).Font.Color = 16777215
$grades = @(@("MVP급","95+"),@("시즌베스트급","90~95"),@("주전라인업급","80~90"),@("로테이션급","75~80"),@("후보급","70~75"),@("예비/신인급","60~70"))
for ($i=0; $i -lt $grades.Count; $i++) { $sum.Cells.Item($gr+1+$i,1)=$grades[$i][0]; $sum.Cells.Item($gr+1+$i,2)=$grades[$i][1] }
$sum.UsedRange.Columns.AutoFit() | Out-Null

# 팀 시트
foreach ($team in $resultsByTeam.Keys) {
    $ts = $wb.Worksheets.Add([System.Reflection.Missing]::Value, $wb.Worksheets.Item($wb.Worksheets.Count))
    $ts.Name = $team
    $headers = @("선수","포지션","주포지션","OVR","등급","비고","신장","체중","윙스팬","GP","MIN") + $ATTRS
    for ($c=0; $c -lt $headers.Count; $c++) { $ts.Cells.Item(1,$c+1) = $headers[$c] }
    $hr = $ts.Range($ts.Cells.Item(1,1), $ts.Cells.Item(1,$headers.Count))
    $hr.Font.Bold = $true; $hr.Interior.Color = 5249798; $hr.Font.Color = 16777215
    $ts.Columns.Item(11).NumberFormat = "@"
    $r = 2
    foreach ($p in $resultsByTeam[$team]) {
        $vals = @($p.선수,$p.포지션,$p.주포지션,$p.OVR,$p.등급,$p.비고,$p.신장,$p.체중,$p.윙스팬,$p.GP,$p.MIN)
        foreach ($a in $ATTRS) { $vals += $p.Attrs[$a] }
        for ($c=0; $c -lt $vals.Count; $c++) { $ts.Cells.Item($r,$c+1) = $vals[$c] }
        $r++
    }
    $ts.UsedRange.Columns.AutoFit() | Out-Null
    $excel.ActiveWindow.SplitRow = 1
    $excel.ActiveWindow.SplitColumn = 1
    $excel.ActiveWindow.FreezePanes = $true
}

if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
$wb.SaveAs($OutFile, 51)
$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

# 콘솔 요약
foreach ($team in $resultsByTeam.Keys) {
    Write-Output "=== $team ==="
    foreach ($p in $resultsByTeam[$team]) {
        Write-Output ("{0,-12} {1,-6} OVR {2}  {3} {4}" -f $p.선수, $p.주포지션, $p.OVR, $p.등급, $p.비고)
    }
}
Write-Output "저장: $OutFile"

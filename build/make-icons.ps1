# Draws the SK80 Studio icons: build/icon.png (1024), build/icon.ico (16..256), src/renderer/icon.png (256),
# src/renderer/tray.png (32) and tray@2x. Run: powershell -ExecutionPolicy Bypass -File build\make-icons.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent

function RoundRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90); $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90); $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure(); return $p
}
function Hue([double]$h) { # hue 0..360 -> Color (full saturation)
  $c = 1.0; $x = 1 - [math]::Abs((($h / 60) % 2) - 1)
  $rgb = switch ([int][math]::Floor($h / 60) % 6) { 0 { 1, $x, 0 } 1 { $x, 1, 0 } 2 { 0, 1, $x } 3 { 0, $x, 1 } 4 { $x, 0, 1 } default { 1, 0, $x } }
  [Drawing.Color]::FromArgb(255, [int](255 * $rgb[0]), [int](255 * $rgb[1]), [int](255 * $rgb[2]))
}

# Full icon: dark tile, glowing gradient rim, 3x2 lit keycaps and the little TFT screen
function DrawFull([int]$S) {
  $b = New-Object Drawing.Bitmap $S, $S
  $g = [Drawing.Graphics]::FromImage($b); $g.SmoothingMode = 'AntiAlias'; $g.Clear([Drawing.Color]::Transparent)
  $k = $S / 1024.0
  $tile = RoundRect (40 * $k) (40 * $k) (944 * $k) (944 * $k) (210 * $k)
  $rim = New-Object Drawing.Drawing2D.LinearGradientBrush((New-Object Drawing.PointF 0, 0), (New-Object Drawing.PointF $S, $S), [Drawing.Color]::FromArgb(255, 255, 42, 42), [Drawing.Color]::FromArgb(255, 123, 43, 255))
  $g.FillPath($rim, $tile)
  $inner = RoundRect (76 * $k) (76 * $k) (872 * $k) (872 * $k) (178 * $k)
  $bg = New-Object Drawing.Drawing2D.LinearGradientBrush((New-Object Drawing.PointF 0, 0), (New-Object Drawing.PointF 0, $S), [Drawing.Color]::FromArgb(255, 30, 33, 41), [Drawing.Color]::FromArgb(255, 13, 15, 19))
  $g.FillPath($bg, $inner)
  # TFT screen (top right) with a tiny gradient "picture"
  $scr = RoundRect (560 * $k) (190 * $k) (270 * $k) (170 * $k) (34 * $k)
  $g.FillPath((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 5, 6, 8))), $scr)
  $sp = RoundRect (586 * $k) (216 * $k) (218 * $k) (118 * $k) (20 * $k)
  $sb = New-Object Drawing.Drawing2D.LinearGradientBrush((New-Object Drawing.PointF (586 * $k), 0), (New-Object Drawing.PointF (804 * $k), 0), [Drawing.Color]::FromArgb(255, 0, 229, 255), [Drawing.Color]::FromArgb(255, 155, 77, 255))
  $g.FillPath($sb, $sp)
  # keycaps: row 1 two caps (left of the screen), rows 2-3 three caps; rainbow across
  $caps = @(
    @(194, 190, 150, 150, 0), @(374, 190, 150, 150, 30),
    @(194, 400, 186, 170, 60), @(410, 400, 186, 170, 140), @(626, 400, 204, 170, 200),
    @(194, 610, 636, 170, 270)
  )
  foreach ($c in $caps) {
    $col = Hue $c[4]
    $glow = RoundRect (($c[0] - 10) * $k) (($c[1] - 10) * $k) (($c[2] + 20) * $k) (($c[3] + 20) * $k) (44 * $k)
    $g.FillPath((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(70, $col))), $glow)
    $cap = RoundRect ($c[0] * $k) ($c[1] * $k) ($c[2] * $k) ($c[3] * $k) (34 * $k)
    $g.FillPath((New-Object Drawing.SolidBrush $col), $cap)
    $top = RoundRect (($c[0] + 14) * $k) (($c[1] + 12) * $k) (($c[2] - 28) * $k) (($c[3] - 40) * $k) (24 * $k)
    $g.FillPath((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(70, 255, 255, 255))), $top)
  }
  $g.Dispose(); return $b
}

# Small/tray icon: same look as the full icon (gradient rim, dark tile, rainbow keys), simplified for 16-32 px
function DrawSmall([int]$S) {
  $b = New-Object Drawing.Bitmap $S, $S
  $g = [Drawing.Graphics]::FromImage($b); $g.SmoothingMode = 'AntiAlias'; $g.Clear([Drawing.Color]::Transparent)
  $k = $S / 32.0
  $rim = New-Object Drawing.Drawing2D.LinearGradientBrush((New-Object Drawing.PointF 0, 0), (New-Object Drawing.PointF $S, $S), [Drawing.Color]::FromArgb(255, 255, 42, 42), [Drawing.Color]::FromArgb(255, 123, 43, 255))
  $g.FillPath($rim, (RoundRect (0.5 * $k) (0.5 * $k) (31 * $k) (31 * $k) (8 * $k)))
  $g.FillPath((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 24, 27, 34))), (RoundRect (2.5 * $k) (2.5 * $k) (27 * $k) (27 * $k) (6.5 * $k)))
  $keys = @(
    @(6, 6.5, 6, 6, 0), @(13, 6.5, 6, 6, 30),
    @(6, 14, 6, 5.5, 60), @(13, 14, 6, 5.5, 140), @(20, 14, 6, 5.5, 200),
    @(6, 21, 20, 5, 270)
  )
  foreach ($c in $keys) { $g.FillPath((New-Object Drawing.SolidBrush (Hue $c[4])), (RoundRect ($c[0] * $k) ($c[1] * $k) ($c[2] * $k) ($c[3] * $k) (1.6 * $k))) }
  # the little screen (top right)
  $sb = New-Object Drawing.Drawing2D.LinearGradientBrush((New-Object Drawing.PointF (20 * $k), 0), (New-Object Drawing.PointF (26 * $k), 0), [Drawing.Color]::FromArgb(255, 0, 229, 255), [Drawing.Color]::FromArgb(255, 155, 77, 255))
  $g.FillPath($sb, (RoundRect (20 * $k) (6.5 * $k) (6 * $k) (6 * $k) (1.6 * $k)))
  $g.Dispose(); return $b
}
function SavePng($bmp, $path) { New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null; $bmp.Save($path, [Drawing.Imaging.ImageFormat]::Png) }

$big = DrawFull 1024
SavePng $big "$root\build\icon.png"
SavePng (DrawFull 256) "$root\src\renderer\icon.png"
SavePng (DrawSmall 32) "$root\src\renderer\tray.png"
SavePng (DrawSmall 64) "$root\src\renderer\tray@2x.png"

# ICO with PNG-compressed entries; 16 and 24 use the simplified drawing
$sizes = 16, 24, 32, 48, 64, 128, 256
$pngs = foreach ($s in $sizes) {
  $bmp = if ($s -le 24) { DrawSmall $s } else { DrawFull $s }
  $ms = New-Object IO.MemoryStream; $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); , $ms.ToArray()
}
$out = New-Object IO.MemoryStream; $wr = New-Object IO.BinaryWriter $out
$wr.Write([uint16]0); $wr.Write([uint16]1); $wr.Write([uint16]$sizes.Count)
$off = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $s = $sizes[$i]; $d = $pngs[$i]
  $wr.Write([byte]($s % 256)); $wr.Write([byte]($s % 256)); $wr.Write([byte]0); $wr.Write([byte]0)
  $wr.Write([uint16]1); $wr.Write([uint16]32); $wr.Write([uint32]$d.Length); $wr.Write([uint32]$off)
  $off += $d.Length
}
foreach ($d in $pngs) { $wr.Write($d) }
[IO.File]::WriteAllBytes("$root\build\icon.ico", $out.ToArray())
"icons ok"

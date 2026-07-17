# Regenerate every app icon size from a single source image.
#
# Usage: powershell -File scripts/make-icons.ps1 -Source path/to/icon.png
#
# The source should be a square, full-bleed image at 1024px or larger. iOS
# applies its own rounded-corner mask, so the artwork must run to all four
# edges with no pre-baked rounding. Outputs are 24-bit PNGs: the App Store
# rejects app icons that carry an alpha channel.
param(
  [Parameter(Mandatory = $true)][string]$Source
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$src = [System.Drawing.Image]::FromFile((Resolve-Path $Source))

if ($src.Width -ne $src.Height) {
  Write-Warning "Source is $($src.Width)x$($src.Height); center-cropping to square."
}
if ([Math]::Min($src.Width, $src.Height) -lt 1024) {
  Write-Warning "Source is smaller than 1024px; the 1024 icon will be upscaled and may look soft."
}

# Center-crop to the largest centered square (a no-op on square sources).
$side = [Math]::Min($src.Width, $src.Height)
$square = New-Object System.Drawing.Bitmap($side, $side)
$g0 = [System.Drawing.Graphics]::FromImage($square)
$g0.DrawImage($src,
  (New-Object System.Drawing.Rectangle(0, 0, $side, $side)),
  (New-Object System.Drawing.Rectangle([int](($src.Width - $side) / 2), [int](($src.Height - $side) / 2), $side, $side)),
  [System.Drawing.GraphicsUnit]::Pixel)
$g0.Dispose()
$src.Dispose()

function Save-Icon($size, $relativePath) {
  $path = Join-Path $root $relativePath
  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($square, 0, 0, $size, $size)
  $g.Dispose()
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $path) | Out-Null
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("  {0,-52} {1}x{1}" -f $relativePath, $size)
}

# PWA / web icons, and the mirror in www/ that Capacitor ships.
Save-Icon 1024 'icons\icon-1024.png'
Save-Icon 512  'icons\icon-512.png'
Save-Icon 192  'icons\icon-192.png'
Save-Icon 180  'icons\apple-touch-icon.png'
Save-Icon 512  'www\icons\icon-512.png'
Save-Icon 192  'www\icons\icon-192.png'
Save-Icon 180  'www\icons\apple-touch-icon.png'

# iOS asset catalog: a single 1024 universal icon (see AppIcon.appiconset).
Save-Icon 1024 'ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png'

$square.Dispose()
Write-Output 'done'

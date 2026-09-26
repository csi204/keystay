# Cloudflare R2 Bucket Provisioning Script (PowerShell)
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   KEYSTAY Cloudflare R2 Setup Script     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Load .env if present
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line.Split("=", 2)
            if ($parts.Length -eq 2) {
                [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
            }
        }
    }
    Write-Host "Loaded environment variables from .env" -ForegroundColor Green
}

$bucketName = if ($env:R2_BUCKET_NAME) { $env:R2_BUCKET_NAME } else { "keystay-assets" }

Write-Host "Checking/Creating R2 Bucket: $bucketName ..." -ForegroundColor Yellow
$output = pnpm dlx wrangler r2 bucket create $bucketName 2>&1 | Out-String

if ($output -match "Created bucket" -or $output -match "already exists") {
    Write-Host "Success: R2 Bucket '$bucketName' is ready!" -ForegroundColor Green
} elseif ($output -match "10042") {
    Write-Host "Warning: R2 is not enabled on your Cloudflare account yet." -ForegroundColor Yellow
    Write-Host "Please visit: https://dash.cloudflare.com/ -> R2 -> Click 'Enable R2' or 'Purchase R2' (Free Tier available)." -ForegroundColor White
} else {
    Write-Host $output
}

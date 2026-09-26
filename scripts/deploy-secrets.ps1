# Deploy Production Secrets to Cloudflare Workers
param (
    [string]$JwtSecret = ""
)

if (-not $JwtSecret -and (Test-Path ".env")) {
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line.StartsWith("JWT_SECRET=")) {
            $JwtSecret = $line.Substring("JWT_SECRET=".Length).Trim()
        }
    }
}

if (-not $JwtSecret) {
    $JwtSecret = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    Write-Host "Generated secure random JWT_SECRET: $JwtSecret" -ForegroundColor Yellow
}

$services = @("keystay-auth-user", "keystay-api-gateway")

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deploying JWT_SECRET to Cloudflare...   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

foreach ($svc in $services) {
    Write-Host "Setting JWT_SECRET on $svc..." -ForegroundColor White
    $JwtSecret | pnpm dlx wrangler secret put JWT_SECRET --name $svc
}

Write-Host "Done setting production secrets." -ForegroundColor Green

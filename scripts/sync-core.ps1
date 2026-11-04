# Copies the shared logic from the phone app, the database, and the SQL engine file into the website project.
# Run it again whenever the app's logic or the data changes:  npm run sync
$ErrorActionPreference = 'Stop'
$app = 'C:\f1-app\formula-db'
$data = 'C:\f1-app\data'
$web = 'C:\f1-app\web'

$core = 'askEngine.ts','records.ts','circuitNames.ts','search.ts','statQueries.ts','eraSpecs.ts','timelineData.ts','teamGroups.ts','types.ts'
New-Item -ItemType Directory -Force "$web\src\core" | Out-Null
foreach ($f in $core) {
  if (Test-Path "$app\$f") { Copy-Item "$app\$f" "$web\src\core\$f" -Force } else { Write-Host "Missing in the app folder: $f" -ForegroundColor Yellow }
}
New-Item -ItemType Directory -Force "$web\public" | Out-Null
if (Test-Path "$data\f1.db") { Copy-Item "$data\f1.db" "$web\public\f1.db" -Force } else { Write-Host "Missing: $data\f1.db" -ForegroundColor Yellow }
$wasm = "$web\node_modules\sql.js\dist\sql-wasm.wasm"
if (Test-Path $wasm) { Copy-Item $wasm "$web\public\sql-wasm.wasm" -Force } else { Write-Host 'sql.js is not installed yet (npm install sql.js)' -ForegroundColor Yellow }
Write-Host 'Core, database and SQL engine copied into the website project.' -ForegroundColor Green

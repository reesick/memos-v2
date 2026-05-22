# Memos Core

TypeScript backend for the Memos local memory workspace.

## Run

```powershell
cd packages\openmemory-js

$env:OM_PORT="8080"
$env:OM_TIER="hybrid"
$env:OM_EMBEDDINGS="synthetic"
$env:OM_METADATA_BACKEND="sqlite"
$env:OM_VECTOR_BACKEND="sqlite"
$root = Resolve-Path ..\..
$env:OM_DB_PATH="$root\data\memos.sqlite"

npm install
npm run dev
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

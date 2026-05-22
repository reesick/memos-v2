# Memos Core

TypeScript backend for the Memos local memory workspace.

## Run

```powershell
cd packages\memos-js

$env:MEMOS_PORT="8080"
$env:MEMOS_TIER="hybrid"
$env:MEMOS_EMBEDDINGS="synthetic"
$env:MEMOS_METADATA_BACKEND="sqlite"
$env:MEMOS_VECTOR_BACKEND="sqlite"
$root = Resolve-Path ..\..
$env:MEMOS_DB_PATH="$root\data\memos.sqlite"

npm install
npm run dev
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

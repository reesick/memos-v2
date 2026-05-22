# Memos Chat Setup

The chat interface connects to the Memos backend and queries local memories in real time.

## Start Backend

```powershell
cd packages/memos-js
npm install
npm run dev
```

The backend starts on `http://localhost:8080`.

## Start Dashboard

```powershell
cd dashboard
$env:NEXT_PUBLIC_API_URL="http://localhost:8080"
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test Memory

```powershell
Invoke-RestMethod http://localhost:8080/health
```

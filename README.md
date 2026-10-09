# ProofLoop — full-stack project

This project preserves the supplied ProofLoop React dashboard and its existing beige/forest-green styling, while adding an Express API, MongoDB persistence, authentication, and proof uploads.

## Requirements
- Node.js 20+ and npm
- MongoDB Community Server running locally (MongoDB Compass is the GUI; the server must also be installed/running)

## 1. Configure the backend
Copy `apps/api/.env.example` to `apps/api/.env` and set a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `JWT_SECRET`. The default MongoDB URI is `mongodb://127.0.0.1:27017/proofloop`.

## 2. Configure the frontend
Copy `apps/web/.env.example` to `apps/web/.env`. Its default is `VITE_API_URL=http://localhost:5000/api`.

## 3. Install and run
From the project root (the folder containing this README and root package.json):

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API health endpoint is http://localhost:5000/api/health.

## Features
- Sign up and log in with bcrypt password hashing and JWT sessions
- User-specific goals and proof entries stored in MongoDB
- Image, link, note, and document proof submissions
- User-specific annual heatmap, recent activity, search, and goal persistence
- Uploads saved locally under `apps/api/uploads`
- Responsive dashboard retains the original supplied layout and styling

## Checking that MongoDB / Compass is really being updated
1. Start MongoDB, then run `npm run dev`. The **API** terminal must print both lines:
   `MongoDB connected: 127.0.0.1:27017/proofloop` and `Collections ready - users: .., goals: .., proofs: ..`
   If it prints `Could not start ProofLoop API`, MongoDB is not running or `MONGODB_URI` is wrong.
2. Open http://localhost:5000/api/health - `database.state` must be `connected`, and `database.collections` shows live document counts. Create a goal in the app and refresh this page: the counts change.
3. In Compass connect to `mongodb://127.0.0.1:27017` (the same host the API prints), open the **proofloop** database and click the refresh icon. Collections are `users`, `goals`, `proofs`. Compass does not auto-refresh.
4. If the app shows a red "Can't load your data" bar, the browser cannot reach the API. Make sure the API terminal is running. In development the API accepts any `localhost`, `127.0.0.1` or LAN origin on any port; for a deployed frontend set `CLIENT_URL` in `apps/api/.env`.
5. `apps/api/.env` is optional in development (safe defaults are used and a warning is printed), but required in production.

## Notes
- The database is created automatically after the first write.
- Supported uploads: PNG, JPG/JPEG, WebP, PDF, DOC, DOCX, TXT; image proof max 5 MB in the UI and all API uploads capped by `MAX_UPLOAD_MB`.
- Local upload storage is for development. Use persistent object storage for production deployments.
- `.env` files are ignored by Git. Never commit secrets.

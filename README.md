# SkillSwap

Learn. Teach. Swap Skills.

SkillSwap is a skill-exchange platform where people create a profile, list skills they can teach and want to learn, match with others, send swap requests, chat after a request is accepted, and earn Skill Credits.

## About

Members start with **100 Skill Credits**. Matching compares your learning list with another person's teaching list (and the reverse) to produce a match percentage. Completed swaps update credits, transaction history, and completed-swap counts.

## Features

- Account registration and JWT login
- Profile editing, avatars, and skill management
- Skill catalog by category
- Discover search and filters (skill, category, rating, location)
- Live matching algorithm (not hardcoded)
- Swap requests: send, accept, reject, complete
- Messaging for accepted/completed swaps (polling)
- Wallet and transaction history
- Seeded demo community

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript, Fetch API
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT + bcryptjs
- **Validation:** express-validator
- **Uploads:** multer

## Project Structure

```
skillswap/
├── server.js
├── seed.js
├── package.json
├── .env.example
├── models/
├── routes/
├── controllers/
├── middleware/
├── utils/
└── public/          # static frontend served by Express
```

## Installation

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd skill-swap-lite
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret used to sign tokens |
| `PORT` | Server port (default `5000`) |
| `NODE_ENV` | `development` or `production` |

Never commit a real `.env` file.

## Running Locally

1. Start MongoDB (local service, Docker, or Atlas).
2. Install dependencies: `npm install`
3. Seed demo data: `npm run seed`
4. Start the API + site:

```bash
npm run dev
```

Or:

```bash
npm start
```

Open [http://localhost:5000](http://localhost:5000).

## API Routes

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| GET | `/api/auth/me` | Yes |
| GET | `/api/users/me` | Yes |
| PUT | `/api/users/me` | Yes |
| POST | `/api/users/me/avatar` | Yes |
| POST | `/api/users/me/skills` | Yes |
| DELETE | `/api/users/me/skills/:skillId` | Yes |
| GET | `/api/users` | Optional |
| GET | `/api/users/matches` | Yes |
| GET | `/api/users/:id` | Optional |
| GET | `/api/skills` | No |
| POST | `/api/skills` | Yes |
| DELETE | `/api/skills/:id` | Yes |
| POST | `/api/swaps` | Yes |
| GET | `/api/swaps/received` | Yes |
| GET | `/api/swaps/sent` | Yes |
| GET | `/api/swaps/active` | Yes |
| PUT | `/api/swaps/:id/accept` | Yes |
| PUT | `/api/swaps/:id/reject` | Yes |
| PUT | `/api/swaps/:id/complete` | Yes |
| GET | `/api/messages` | Yes |
| GET | `/api/messages/:userId` | Yes |
| POST | `/api/messages` | Yes |
| GET | `/api/wallet` | Yes |
| GET | `/api/transactions` | Yes |

Send `Authorization: Bearer <token>` on protected routes.

## Demo ERP Credentials

Every demo user uses password **`Password123`**. You can log in using their **Email**, **Username**, or **ERP ID**:

| Name | Email | Username | ERP ID |
|---|---|---|---|
| **Anchal Singh** | `anchal@skillswap.dev` | `anchal` | `ERP202601` |
| **Gargi Bothara** | `gargi@skillswap.dev` | `gargi` | `ERP202602` |
| **Shreya Ashtekar** | `shreya@skillswap.dev` | `shreya` | `ERP202603` |
| **Shravani Deshmukh** | `shravani@skillswap.dev` | `shravani` | `ERP202604` |

Anchal and Gargi already have an **accepted** swap so you can test chat immediately (login as `anchal@skillswap.dev` or with ERP ID `ERP202601`). Shreya has a pending request waiting for Anchal, and Shravani has a pending request for Gargi.

## Deployment

The app is a single Node process that serves `/public` and `/api`.

### Render / Railway

1. Push this repository to GitHub.
2. Create a Web Service from the repo.
3. Set the start command to `npm start`.
4. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`.
5. Use a MongoDB Atlas cluster. Allow the host IPs (or `0.0.0.0/0` if you accept that risk).
6. Deploy. Run `npm run seed` once from a one-off command or locally against Atlas if you want demo users in production.

The server listens on `process.env.PORT || 5000`. Frontend API calls use relative `/api` URLs, so they work in production without hardcoded localhost.

## Future Improvements

- WebSocket chat instead of polling
- Email verification and password reset
- Session scheduling and video-call links
- Reviews after each completed swap
- Admin moderation dashboard

## License

MIT

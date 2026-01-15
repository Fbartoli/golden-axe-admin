# Golden Axe Admin Panel

Admin panel for [Golden Axe](https://github.com/indexsupply/golden-axe), an EVM blockchain indexer built in Rust.

## Overview

This Next.js application provides a web-based administration interface for managing and monitoring Golden Axe indexer deployments. It connects to both the frontend database (user plans, API keys) and backend database (indexed blockchain data) to provide comprehensive operational visibility.

## Features

### Network Management
- Add, edit, and remove blockchain networks
- Configure RPC endpoints, batch sizes, and concurrency settings
- Enable/disable chains for indexing
- Set custom start blocks for each network

### User Management
- View all users with their subscription plans
- Track API key counts and usage statistics (last 30 days)
- Drill down into individual user details:
  - API keys and their origins
  - Plan history with payment info (Daimo/Stripe)
  - Daily query usage
  - Collaborators

### API Key Administration
- Create new API keys for users
- Configure allowed origins per key
- Soft-delete (revoke) existing keys
- View all keys across the platform

### Sync Status Monitoring
- Real-time view of indexing progress per chain
- Track blocks and logs synced
- Compare local sync state vs RPC head block
- Calculate sync percentage and estimated time to completion
- Historical sync rate tracking (blocks/hour, logs/hour)

### Query Interface
- Execute SQL queries against indexed blockchain data
- Select target chain for queries
- Support for event signature filtering
- View formatted query results

### ABI Event Decoder
- Decode raw event logs using contract ABIs
- Support for both JSON and human-readable ABI formats
- Display decoded event names and arguments

### RPC Health Monitoring
- Check latency of all configured RPC endpoints
- Verify block number responses
- Track connection errors
- URLs are masked to protect API keys

### System Health
- CPU usage and load averages
- Memory utilization
- Disk space monitoring
- System uptime tracking

### Alerting System
Built-in alerts for:
- **Sync Behind**: Chain is falling behind RPC head
- **Sync Stalled**: No new blocks indexed recently
- **RPC Errors**: Connection or response failures
- **High Memory**: Memory usage exceeds thresholds
- **High CPU**: CPU usage exceeds thresholds
- **High Disk**: Disk space running low

Alert severities: `info`, `warning`, `critical`

### Custom Alert Rules
- Create custom threshold-based rules
- Configurable comparison operators (>, >=, <, <=, =)
- Per-chain or system-wide rules
- Track when rules were last triggered

### Notifications
- **Webhooks**: Send alerts to external services (Slack, Discord, etc.)
- **Email**: Configure email recipients for alerts
- Filter notifications by event type
- Test webhook connectivity

### Database Monitoring
- View table sizes for blocks, logs, and transactions
- Track total database size
- Query history with duration metrics
- Per-user API usage analytics

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Runtime**: Bun
- **Database**: PostgreSQL (via `postgres` package)
- **Blockchain Utils**: viem (for ABI decoding)
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Bun runtime
- Access to Golden Axe frontend and backend PostgreSQL databases

### Environment Variables
```env
DATABASE_URL=postgres://...         # Frontend database (users, plans, keys)
BE_DATABASE_URL=postgres://...      # Backend database (indexed blockchain data)
BE_URL=http://golden-axe-be:8000    # Backend API URL
NEXT_PUBLIC_URL=http://localhost:3000
```

### Installation
```bash
bun install
```

### Development
```bash
bun run dev
```
Runs on http://localhost:3001

### Production
```bash
bun run build
bun run start
```
Runs on http://localhost:3000

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/networks` | List all configured networks |
| `POST /api/networks` | Add/update network configuration |
| `DELETE /api/networks` | Remove a network |
| `GET /api/users` | List all users with stats |
| `GET /api/users/[email]` | Get detailed user info |
| `GET /api/keys` | List all API keys |
| `POST /api/keys` | Create new API key |
| `DELETE /api/keys` | Revoke API key |
| `GET /api/status` | Get sync status for all chains |
| `GET /api/sync-history` | Get historical sync data |
| `POST /api/query` | Execute query against backend |
| `POST /api/decode` | Decode event log with ABI |
| `GET /api/rpc-health` | Check RPC endpoint health |
| `GET /api/system-health` | Get system resource metrics |
| `GET /api/monitoring` | Get database and usage stats |
| `GET /api/alerts` | Get current alerts |
| `POST /api/alerts` | Acknowledge/clear alerts |
| `GET /api/notifications` | Get notification config |
| `POST /api/notifications` | Manage webhooks/emails/rules |

## License

See the [Golden Axe repository](https://github.com/indexsupply/golden-axe) for license information.

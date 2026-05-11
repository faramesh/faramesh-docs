# Web UI

The Faramesh web UI provides a modern, real-time dashboard for monitoring and managing AI agent actions.

## Accessing the UI

1. Start the Faramesh server:
   ```bash
   faramesh serve
   ```

2. Open your browser to:
   ```
   http://127.0.0.1:8000
   ```

The UI is served directly from the Faramesh server - no separate deployment required.

---

## Features

### Action Table

The main action table displays all actions with:

- **ID**: Action UUID (truncated for readability)
- **Status**: Current action status with color coding
- **Risk Level**: Computed risk (low/medium/high) with color coding
- **Tool**: Tool name (shell, http, stripe, etc.)
- **Operation**: Operation name (run, get, refund, etc.)
- **Params**: Tool-specific parameters (truncated)
- **Agent ID**: Agent identifier
- **Created**: Timestamp

**Status Colors:**
- 🟢 Green: `allowed`, `approved`, `succeeded`
- 🟡 Yellow: `pending_approval`
- 🔴 Red: `denied`, `failed`
- 🔵 Blue: `executing`

**Risk Colors:**
- 🟢 Green: `low`
- 🟡 Yellow: `medium`
- 🔴 Red: `high`

### Real-Time Updates

The UI uses Server-Sent Events (SSE) to receive real-time updates:

- New actions appear automatically
- Status changes update in real-time
- No page refresh required
- Connection status indicator in header

### Filters

Filter actions by:

- **Status**: `pending_approval`, `allowed`, `denied`, `executing`, `succeeded`, `failed`
- **Agent ID**: Filter by specific agent
- **Tool**: Filter by tool name
- **Search**: Full-text search across action fields

**Keyboard Shortcut:** Press `/` to focus the search input.

### Pagination

Navigate through large action lists:

- Previous/Next buttons
- Page numbers
- Configurable page size (default: 20)

### Action Details Drawer

Click any action row to open the detail drawer showing:

- **Full Action Information**:
  - Complete UUID
  - All parameters (full JSON)
  - Context metadata
  - Policy decision and reason
  - Risk level and explanation
  - Approval token (if applicable)

- **Event Timeline**:
  - Complete history of all events
  - Timestamps for each event
  - Event metadata
  - Visual timeline view

- **Actions**:
  - Approve button (if `pending_approval`)
  - Deny button (if `pending_approval`)
  - Start button (if `allowed` or `approved`)
  - Copy curl commands button
  - Copy action JSON button

### Approve/Deny Actions

For actions in `pending_approval` status:

1. Click the action row to open details
2. Click **Approve** or **Deny** button
3. Optionally enter a reason
4. Action status updates immediately via SSE

**Note:** Approval requires the correct approval token (handled automatically by the UI).

### Copy Commands

The UI provides one-click copy buttons for:

- **cURL Commands**: Ready-to-use curl commands for approve/deny/get
- **Action JSON**: Full action object as JSON
- **Event Timeline**: Complete event history as JSON

### Action Composer

Submit new actions directly from the UI:

1. Click **New Action** button (or press `N`)
2. Fill in the form:
   - Agent ID
   - Tool
   - Operation
   - Params (JSON)
   - Context (JSON, optional)
3. Click **Submit**
4. Action appears in the table immediately

### Dark/Light Mode

Toggle between dark and light themes:

- Click the theme toggle in the header
- Preference is saved to localStorage
- Respects system preference on first load

**Default:** Dark mode

### Demo Mode

When `FARAMESH_DEMO=1` is set and the database is empty, the UI shows:

- **Demo Badge**: Visual indicator on demo-seeded actions
- **Sample Data**: 5 pre-seeded actions for immediate testing

---

## User Flows

### Flow 1: Approve a Pending Action

1. **View Actions**: See action in table with `pending_approval` status
2. **Open Details**: Click action row
3. **Review**: Check tool, operation, params, and risk level
4. **Approve**: Click "Approve" button
5. **Confirm**: See success toast and status update to `approved`
6. **Execute**: Action can now be started (if executor is configured)

### Flow 2: Monitor Action Execution

1. **Submit Action**: Via SDK, API, or UI composer
2. **View in Table**: Action appears with initial status
3. **Watch Updates**: Status changes update in real-time via SSE
4. **View Timeline**: Click action to see complete event history
5. **Check Result**: Final status (`succeeded` or `failed`) with result details

### Flow 3: Search and Filter

1. **Set Filters**: Use status, agent, or tool filters
2. **Search**: Type in search box (searches all fields)
3. **Navigate**: Use pagination to browse filtered results
4. **Clear**: Reset filters to see all actions

### Flow 4: Debug Policy Decision

1. **Find Action**: Use filters/search to find specific action
2. **Open Details**: Click action row
3. **Review Decision**: See policy decision and reason
4. **Check Risk**: See risk level and risk rule explanation
5. **View Events**: Check event timeline for decision_made event
6. **Use Explain**: CLI command `faramesh explain <id>` for detailed explanation

---

## Components

### NavBar

Top navigation bar with:
- Faramesh logo
- Theme toggle (dark/light)
- Connection status indicator (SSE)
- New Action button

### PolicyBanner

Banner showing:
- Policy file path
- Policy version
- Policy status (loaded/error)

### ActionTable

Main table component with:
- Sortable columns
- Color-coded status/risk
- Click handlers for row selection
- Pagination controls

### ActionDetails

Detail drawer showing:
- Full action information
- Event timeline
- Action buttons (approve/deny/start)
- Copy buttons

### ActionComposer

Form for submitting new actions:
- JSON editor for params/context
- Validation
- Submit handler

### Toast

Notification system for:
- Success messages
- Error messages
- Info messages

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search input |
| `N` | Open new action composer (if implemented) |
| `ESC` | Close detail drawer |

---

## Browser Compatibility

The UI is built with modern web technologies:

- **React 18+**
- **TypeScript**
- **Tailwind CSS**
- **Server-Sent Events (SSE)**

**Supported Browsers:**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**Requirements:**
- JavaScript enabled
- Modern browser with ES6+ support

---

## Troubleshooting

### UI Not Loading

**Check:**
1. Server is running: `faramesh serve`
2. Browser console for errors
3. Network tab for failed requests
4. CORS settings if accessing from different origin

### Real-Time Updates Not Working

**Check:**
1. SSE connection status indicator in header
2. Browser console for SSE errors
3. Network tab for `/v1/events` connection
4. Server logs for SSE errors

### Actions Not Appearing

**Check:**
1. Filters are not hiding actions
2. Search query is not too restrictive
3. Pagination (check other pages)
4. Server is receiving actions (check server logs)

### Theme Not Persisting

**Check:**
1. Browser allows localStorage
2. Not in private/incognito mode
3. Browser settings allow site data

---

## API Integration

The UI uses the same REST API as the CLI and SDKs:

- `GET /v1/actions` - List actions
- `GET /v1/actions/{id}` - Get action details
- `POST /v1/actions/{id}/approval` - Approve/deny action
- `POST /v1/actions/{id}/start` - Start execution
- `GET /v1/actions/{id}/events` - Get event timeline
- `GET /v1/events` - SSE stream

See [API Reference](API.md) for complete API documentation.

---

## Customization

### Building the UI

To rebuild the UI after making changes:

```bash
cd web
npm install
npm run build
```

The built UI is served from `src/faramesh/web/` directory.

### Development Mode

For UI development with hot reload:

```bash
cd web
npm install
npm run dev
```

Then access the UI at the Vite dev server URL (usually `http://localhost:5173`).

---

## See Also

- [API Reference](API.md) - REST API endpoints
- [CLI Reference](CLI.md) - Command-line interface
- [Quick Start](../QUICKSTART.md) - Getting started guide
- [Troubleshooting](Troubleshooting.md) - Common issues and fixes

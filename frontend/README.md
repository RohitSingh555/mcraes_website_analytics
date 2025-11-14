# McRAE's Website Analytics - Frontend

React frontend dashboard for syncing and viewing Scrunch AI data.

## Features

- 📊 Dashboard with statistics overview
- 🔄 Sync data from Scrunch AI API (brands, prompts, responses)
- 📋 View synced data in organized tables
- 🔍 Filter data by various criteria
- 🎨 Modern, responsive UI

## Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend FastAPI server running on `http://localhost:8000`

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (optional, defaults are already set):
   ```bash
   cp .env.example .env
   ```

   The `.env` file should contain:
   ```
   VITE_API_BASE_URL=http://localhost:8000
   ```

### Running the Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Usage

1. **Start the backend server** (if not already running):
   ```bash
   python main.py
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the dashboard** at `http://localhost:3000`

4. **Sync Data**:
   - Click "Sync Data" tab
   - Use buttons to sync brands, prompts, responses, or all data
   - Apply filters if needed before syncing

5. **View Data**:
   - Click "View Data" tab
   - Select data type (Brands, Prompts, or Responses)
   - Apply filters and click "Apply Filters"

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx      # Main dashboard component
│   │   ├── SyncPanel.jsx      # Sync controls panel
│   │   └── DataView.jsx       # Data viewing component
│   ├── services/
│   │   └── api.js             # API service for backend calls
│   ├── App.jsx                # Root component
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles
│   └── App.css                # App-specific styles
├── index.html                 # HTML template
├── vite.config.js             # Vite configuration
├── package.json               # Dependencies
└── .env                       # Environment variables
```

## API Integration

The frontend communicates with the FastAPI backend at `http://localhost:8000`:

- Sync endpoints: `/api/v1/sync/*`
- Data endpoints: `/api/v1/data/*`
- Status endpoint: `/api/v1/sync/status`

## Note on Scrunch AI Token

The Scrunch AI API token is stored in the **backend** `.env` file, not in the frontend:

```
SCRUNCH_API_TOKEN=c62a3e304839aec08441e87b727f14880d297f7713d26005c4e667e729f3bb4a
```

The frontend only needs to know the backend API URL.


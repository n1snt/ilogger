# iLogger Visualizer

A React application to visualize logs exported from iLogger by time. Upload a zip file containing log files to see all logs displayed in a timeline view, with each logger shown in its own column.

## Features

- **Upload Zip Files**: Drag and drop or browse to upload `illogger-logs.zip` files
- **Timeline Visualization**: View all logs chronologically across multiple loggers
- **Column Layout**: Each logger gets its own column showing its logs
- **Time-based Positioning**: Logs are positioned based on their timestamps
- **Interactive Controls**:
  - Toggle loggers on/off
  - Adjust time scale (zoom in/out)
  - Scroll through timeline
- **Session Separators**: Visual indicators for new sessions

## Getting Started

### Installation

```bash
cd log-visualizer
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Usage

1. Export logs from your application using iLogger's download functionality
2. Upload the `illogger-logs.zip` file to this visualizer
3. Use the controls to:
   - Select which loggers to display
   - Adjust the time scale to zoom in/out
   - Scroll through the timeline
   - Hover over log entries to see full details

## How It Works

The visualizer:
1. Extracts log files from the uploaded zip
2. Parses each log file to extract timestamps and messages
3. Sorts all logs chronologically
4. Displays logs in columns (one per logger) positioned by time
5. Provides a timeline on the left showing time markers

## Supported Formats

- Multi-file zip format (default iLogger export)
- Log files with ISO timestamp format: `[2024-01-15T10:30:00.000Z] message`
- Session separators are automatically detected and highlighted

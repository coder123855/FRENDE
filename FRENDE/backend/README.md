# Frende Backend

## Setup

1. Create and activate a virtual environment:
   - Windows: `FRENDE/backend/venv/Scripts/activate`
   - macOS/Linux: `source FRENDE/backend/venv/bin/activate`

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

```bash
uvicorn main:app --reload
```

The server will be available at http://127.0.0.1:8000 
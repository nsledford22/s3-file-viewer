# s3-file-viewer
Minimal React app to preview / download files from AWS S3 or upload files to S3.

## Frontend
contains code for the ui of the application.
- Built with Vite + React
- Utilizes Mantine for all ui components and styling

## Backend
contains code for the api to connect to AWS and read S3 files
- built with FastAPI and Pydantic

## Prerequisites (What I built this app with)
- python 3.12.8
- nodejs 23.5.0
- aws cli installed 

### Steps:
- clone the repo:
```bash
    git clone https://github.com/nsledford22/s3-file-viewer.git
    cd s3-file-viewer
```
- Setup backend:
```bash
    cd backend
    # Create .venv
    python -m venv .venv

    # Activate .venv
    # macOS / Linux:
    source .venv/bin/activate
    # Windows:
    .venv/Scripts/activate

    # Install requirements.txt
    pip install -r requirements.txt
```
- Run Fastapi Server:
```bash
    # Application should be running on http://127.0.0.1:8000
    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Setup frontend:
```bash
    cd frontend
    # install node_modules from package.json
    npm i

    # create .env file
    touch .env

    # run the server
    npm run dev
```
- Add VITE_API_URL to .env file
- Run frontend server
```bash
    # Application should now be running on http://localhost:5173
    npm run dev
```

### Future Enhancements
features I'd like to add in the near future!
- enhance excel / csv viewing through [Univer Sheets](https://docs.univer.ai/guides/sheets) 
- support other file types (json, sql, etc.)



from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.routing import APIRouter

# Create FastAPI instance
app = FastAPI()

# Configure a template directory
templates = Jinja2Templates(directory="templates")

# Define a static files directory (for CSS/JS files)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Define a router
router = APIRouter()

# Define an HTML endpoint
@router.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "greeting": "Welcome to FastAPI!"})

# Another example HTML endpoint
@router.get("/about", response_class=HTMLResponse)
async def about_page(request: Request):
    return templates.TemplateResponse("about.html", {"request": request, "message": "This is the About Page."})

# Include the router in the app
app.include_router(router)
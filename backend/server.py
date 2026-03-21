from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import csv
from pymongo import UpdateOne
import io
import jwt
import bcrypt
import cloudinary
import cloudinary.uploader
from cloudinary.exceptions import Error as CloudinaryError
from cloudinary.utils import cloudinary_url

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import certifi

# MongoDB connection (tuned for lower latency)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    tlsCAFile=certifi.where(),
    maxPoolSize=20,
    minPoolSize=5,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    retryWrites=True,
    retryReads=True,
)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required. Set it in .env")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI()
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Health check endpoint (responds immediately for Render/deployment health checks)
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "LifeOS API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    current_level: int = 1
    total_xp: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ChecklistItem(BaseModel):
    text: str
    completed: bool = False

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: int = 1
    estimated_time: Optional[int] = None
    due_date: Optional[str] = None
    tags: List[str] = []
    color: Optional[str] = "bg-card"
    checklist: List[ChecklistItem] = []
    position: Optional[int] = 0
    is_pinned: bool = False

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    estimated_time: Optional[int] = None
    due_date: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    color: Optional[str] = None
    checklist: Optional[List[ChecklistItem]] = None
    position: Optional[int] = None
    is_pinned: Optional[bool] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    description: str
    priority: int
    status: str
    category: Optional[str] = None
    estimated_time: Optional[int] = None
    actual_time: Optional[int] = None
    due_date: Optional[str] = None
    completed_at: Optional[str]
    tags: List[str]
    checklist: List[ChecklistItem] = []
    color: str = "bg-card"
    position: int = 0
    is_pinned: bool = False
    created_at: str
    updated_at: str


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    categories: List[str] = ["general"]  # study, budget, general, quick
    is_favorite: bool = False
    parent_id: Optional[str] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    categories: Optional[List[str]] = None
    is_favorite: Optional[bool] = None
    parent_id: Optional[str] = None

class UploadResponse(BaseModel):
    url: str

class UploadImageResponse(BaseModel):
    thumbnailId: str
    fullImageId: str
    thumbnailUrl: str
    fullImageUrl: str

class NoteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    content: str
    categories: List[str] = ["general"]
    tags: List[str] = []
    is_favorite: bool
    parent_id: Optional[str] = None
    created_at: str
    updated_at: str

class BudgetSheetCreate(BaseModel):
    name: str

class BudgetSheetUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None

class BudgetRowCreate(BaseModel):
    date: str = ""
    description: str = ""
    credit: float = 0
    debit: float = 0

class BudgetRowUpdate(BaseModel):
    date: Optional[str] = None
    description: Optional[str] = None
    credit: Optional[float] = None
    debit: Optional[float] = None
    order: Optional[int] = None

class FocusSessionCreate(BaseModel):
    duration_planned: int

class FocusSessionComplete(BaseModel):
    duration_actual: int
    interrupted: bool = False

class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    duration_planned: int
    duration_actual: Optional[int]
    started_at: str
    completed_at: Optional[str]
    interrupted: bool

class DailyActivityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    date: str
    tasks_completed: int
    focus_time: int
    notes_created: int

class AchievementResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    type: str
    requirement: int
    xp_reward: int
    badge_icon: str
    unlocked: bool = False
    unlocked_at: Optional[str] = None

class DashboardStats(BaseModel):
    current_streak: int
    longest_streak: int
    total_xp: int
    current_level: int
    notes_count: int
    total_tasks_completed: int
    total_focus_time: int

class HabitCreate(BaseModel):
    title: str
    icon: Optional[str] = "☀️"
    order: Optional[int] = None

class HabitUpdate(BaseModel):
    title: Optional[str] = None
    icon: Optional[str] = None
    order: Optional[int] = None
    is_completed: Optional[bool] = None

class HabitResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    icon: str
    order: int
    is_completed: bool
    last_completed_date: Optional[str] = None
    created_at: str

class HabitReorder(BaseModel):
    habit_ids: List[str]

# ============ HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(ZoneInfo("Asia/Kolkata")) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_level(xp: int) -> int:
    if xp < 1000:
        return max(1, xp // 100)
    elif xp < 4000:
        return 10 + (xp - 1000) // 200
    elif xp < 16500:
        return 25 + (xp - 4000) // 500
    else:
        return 50 + (xp - 16500) // 1000

async def add_xp(user_id: str, xp_amount: int):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user:
        new_xp = user.get("total_xp", 0) + xp_amount
        new_level = calculate_level(new_xp)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"total_xp": new_xp, "current_level": new_level}}
        )

async def update_streak(user_id: str):
    today = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")
    yesterday = (datetime.now(ZoneInfo("Asia/Kolkata")) - timedelta(days=1)).strftime("%Y-%m-%d")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    
    # Only use daily_activity — no fallback to db.tasks to avoid double-counting
    daily_stats = await db.daily_activity.find_one({"user_id": user_id, "date": today})
    activity_today = 0
    if daily_stats:
        activity_today = daily_stats.get("tasks_completed", 0) + daily_stats.get("focus_time", 0)
    
    if activity_today > 0:
        last_streak_date = user.get("last_streak_date", "")
        current_streak = user.get("current_streak", 0)
        longest_streak = user.get("longest_streak", 0)
        
        if last_streak_date == today:
            return  # Already updated today
        elif last_streak_date == yesterday:
            current_streak += 1
        else:
            current_streak = 1
        
        longest_streak = max(longest_streak, current_streak)
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "current_streak": current_streak,
                "longest_streak": longest_streak,
                "last_streak_date": today
            }}
        )

async def update_daily_activity(user_id: str, field: str, increment: int = 1):
    today = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")
    
    existing = await db.daily_activity.find_one({"user_id": user_id, "date": today}, {"_id": 0})
    
    if existing:
        await db.daily_activity.update_one(
            {"user_id": user_id, "date": today},
            {"$inc": {field: increment}}
        )
    else:
        activity = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "date": today,
            "tasks_completed": 0,
            "focus_time": 0,
            "notes_created": 0,
        }
        activity[field] = increment
        await db.daily_activity.insert_one(activity)

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB

_cloudinary_configured = False


def _configure_cloudinary():
    global _cloudinary_configured
    if _cloudinary_configured:
        return

    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME", "").strip()
    api_key = os.environ.get("CLOUDINARY_API_KEY", "").strip()
    api_secret = os.environ.get("CLOUDINARY_API_SECRET", "").strip()

    if not cloud_name or not api_key or not api_secret:
        raise HTTPException(
            status_code=500,
            detail=(
                "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env"
            ),
        )

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    _cloudinary_configured = True


def _cloudinary_thumb_url(public_id: str) -> str:
    thumb_url, _ = cloudinary_url(
        public_id,
        secure=True,
        resource_type="image",
        transformation=[{"width": 200, "crop": "scale", "quality": "auto", "fetch_format": "auto"}],
    )
    return thumb_url


@api_router.post("/upload-image", response_model=UploadImageResponse)
@app.post("/upload-image", response_model=UploadImageResponse)
@limiter.limit("20/minute")
async def upload_image(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload image to Cloudinary and return thumbnail + full image references."""
    try:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}")

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(content) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB")

        _configure_cloudinary()
        folder = os.environ.get("CLOUDINARY_FOLDER", "NotesAppImages").strip() or "NotesAppImages"

        base_public_id = f"{user['id']}_{uuid.uuid4().hex}"
        upload_stream = io.BytesIO(content)
        upload_stream.name = file.filename or f"{base_public_id}{ext or '.jpg'}"

        uploaded = cloudinary.uploader.upload(
            upload_stream,
            resource_type="image",
            folder=folder,
            public_id=base_public_id,
            overwrite=False,
            use_filename=False,
            unique_filename=False,
        )

        full_id = uploaded.get("public_id")
        full_url = uploaded.get("secure_url") or uploaded.get("url")
        if not full_id or not full_url:
            raise HTTPException(status_code=500, detail="Cloudinary upload failed to return file metadata")

        thumb_url = _cloudinary_thumb_url(full_id)

        return UploadImageResponse(
            thumbnailId=f"{full_id}:thumb200",
            fullImageId=full_id,
            thumbnailUrl=thumb_url,
            fullImageUrl=full_url,
        )
    except HTTPException:
        raise
    except CloudinaryError as e:
        logger.error(f"Cloudinary upload error: {e}")
        raise HTTPException(status_code=502, detail=f"Cloudinary upload failed: {str(e)}")
    except Exception as e:
        logger.error(f"Image upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


@api_router.post("/upload", response_model=UploadResponse)
@limiter.limit("20/minute")
async def upload_file(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Backward-compatible upload endpoint returning thumbnail URL."""
    uploaded = await upload_image(request, file, user)
    return UploadResponse(url=uploaded.thumbnailUrl)


@api_router.get("/image/{file_id:path}")
@app.get("/image/{file_id:path}")
async def get_image(file_id: str):
    """Resolve image by Cloudinary public_id and redirect to its CDN URL."""
    _configure_cloudinary()
    # If a thumbnail pseudo-id is passed, map to original image id.
    normalized_id = file_id.replace(":thumb200", "")
    full_url, _ = cloudinary_url(normalized_id, secure=True, resource_type="image")
    return RedirectResponse(full_url, status_code=307)

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": data.username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": email,
        "username": data.username,
        "password_hash": hash_password(data.password),
        "current_level": 1,
        "total_xp": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "last_streak_date": "",
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, email)
    user_response = UserResponse(
        id=user_id,
        email=email,
        username=data.username,
        current_level=1,
        total_xp=0,
        current_streak=0,
        longest_streak=0,
        created_at=now
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: UserLogin):
    email = data.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        current_level=user.get("current_level", 1),
        total_xp=user.get("total_xp", 0),
        current_streak=user.get("current_streak", 0),
        longest_streak=user.get("longest_streak", 0),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        current_level=user.get("current_level", 1),
        total_xp=user.get("total_xp", 0),
        current_streak=user.get("current_streak", 0),
        longest_streak=user.get("longest_streak", 0),
        created_at=user["created_at"]
    )

@api_router.post("/auth/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh_token(request: Request, user: dict = Depends(get_current_user)):
    """Issue a new token for an authenticated user (before current token expires)."""
    token = create_token(user["id"], user["email"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        current_level=user.get("current_level", 1),
        total_xp=user.get("total_xp", 0),
        current_streak=user.get("current_streak", 0),
        longest_streak=user.get("longest_streak", 0),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.delete("/auth/delete-account")
async def delete_user_account(user: dict = Depends(get_current_user)):
    """Delete user account and all associated data (cascading delete)."""
    user_id = user["id"]

    # Delete all user data from all collections
    await db.tasks.delete_many({"user_id": user_id})
    await db.notes.delete_many({"user_id": user_id})
    await db.budget_rows.delete_many({"user_id": user_id})
    await db.budget_sheets.delete_many({"user_id": user_id})
    await db.focus_sessions.delete_many({"user_id": user_id})
    await db.habits.delete_many({"user_id": user_id})
    await db.daily_activity.delete_many({"user_id": user_id})
    await db.user_achievements.delete_many({"user_id": user_id})

    # Finally delete the user
    await db.users.delete_one({"id": user_id})

    return {"message": "Account and all data deleted successfully"}

# ============ TASK ROUTES ============

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tasks

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    task_id = str(uuid.uuid4())
    
    task_doc = {
        "id": task_id,
        "user_id": user["id"],
        "title": data.title,
        "description": data.description or "",
        "priority": data.priority,
        "position": data.position if data.position is not None else 0,
        "status": "pending",
        "estimated_time": data.estimated_time,
        "due_date": data.due_date,
        "completed_at": None,
        "tags": data.tags,
        "checklist": [item.model_dump() for item in data.checklist],
        "color": data.color,
        "is_pinned": data.is_pinned,
        "created_at": now,
        "updated_at": now
    }
    
    await db.tasks.insert_one(task_doc)
    await add_xp(user["id"], 5)  # XP for creating a task
    
    return TaskResponse(**task_doc)

@api_router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    update_data["updated_at"] = now
    
    old_status = task.get("status", "pending")
    new_status = update_data.get("status", old_status)
    
    # Handle checklist item completions
    if "checklist" in update_data:
        old_completed = sum(1 for item in task.get("checklist", []) if item.get("completed"))
        new_completed = sum(1 for item in update_data["checklist"] if item.get("completed"))
        newly_completed = new_completed - old_completed
        
        if newly_completed > 0:
            xp_reward = (10 + (task.get("priority", 1) * 10)) * newly_completed
            await add_xp(user["id"], xp_reward)
            await update_daily_activity(user["id"], "tasks_completed", newly_completed)
            await update_streak(user["id"])
            await check_achievements(user["id"])

    # Handle status transition: non-completed -> completed
    if new_status == "completed" and old_status != "completed":
        update_data["completed_at"] = now
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
        
        # Trigger gamification side effects (only if the card itself was marked completed)
        xp_reward = 10 + (task.get("priority", 1) * 10)
        await add_xp(user["id"], xp_reward)
        await update_streak(user["id"])
        await update_daily_activity(user["id"], "tasks_completed")
    # Handle status transition: completed -> non-completed (undo)
    elif old_status == "completed" and new_status != "completed":
        update_data["completed_at"] = None
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    else:
        await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated_task

@api_router.patch("/tasks/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": "completed", "completed_at": now, "updated_at": now}}
    )
    
    # Award XP based on priority
    xp_reward = 10 + (task.get("priority", 1) * 10)
    await add_xp(user["id"], xp_reward)
    
    # Update streak and daily activity
    await update_streak(user["id"])
    await update_daily_activity(user["id"], "tasks_completed")
    await check_achievements(user["id"])
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated_task


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

# ============ NOTE ROUTES ============

@api_router.get("/notes", response_model=List[NoteResponse])
async def get_notes(category: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if category:
        query["category"] = category
    
    notes = await db.notes.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    # Handle legacy data and field rename
    for n in notes:
        if "categories" not in n:
            n["categories"] = [n.pop("category", "general")] if isinstance(n.get("category"), str) else n.get("category", ["general"])
    return notes

@api_router.post("/notes", response_model=NoteResponse)
async def create_note(data: NoteCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    note_id = str(uuid.uuid4())
    
    note_doc = {
        "id": note_id,
        "user_id": user["id"],
        "title": data.title,
        "content": data.content,
        "categories": data.categories,
        "is_favorite": data.is_favorite,
        "parent_id": data.parent_id,
        "tags": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.notes.insert_one(note_doc)
    await add_xp(user["id"], 5)
    await update_daily_activity(user["id"], "notes_created")
    
    return NoteResponse(**note_doc)

@api_router.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, user: dict = Depends(get_current_user)):
    note = await db.notes.find_one({"id": note_id, "user_id": user["id"]}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if "categories" not in note:
        note["categories"] = [note.pop("category", "general")] if isinstance(note.get("category"), str) else note.get("category", ["general"])
    return note

@api_router.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, data: NoteUpdate, user: dict = Depends(get_current_user)):
    note = await db.notes.find_one({"id": note_id, "user_id": user["id"]}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    
    await db.notes.update_one({"id": note_id}, {"$set": update_data})
    
    updated_note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if "categories" not in updated_note:
        updated_note["categories"] = [updated_note.pop("category", "general")] if isinstance(updated_note.get("category"), str) else updated_note.get("category", ["general"])
    return updated_note

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(get_current_user)):
    # Find the note to be deleted
    note = await db.notes.find_one({"id": note_id, "user_id": user["id"]}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Get the deleted note's parent_id (could be None if it's a root note)
    deleted_parent_id = note.get("parent_id")

    # Find all children of the note being deleted
    children = await db.notes.find(
        {"parent_id": note_id, "user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", 1).to_list(1000)

    if children:
        # First child becomes the new parent for its siblings
        first_child = children[0]
        first_child_id = first_child["id"]

        # Update first child's parent to deleted note's parent (promotes it up)
        await db.notes.update_one(
            {"id": first_child_id},
            {"$set": {"parent_id": deleted_parent_id}}
        )

        # Update remaining children to have first child as their new parent
        if len(children) > 1:
            sibling_ids = [c["id"] for c in children[1:]]
            await db.notes.update_many(
                {"id": {"$in": sibling_ids}},
                {"$set": {"parent_id": first_child_id}}
            )

    # Delete the note
    await db.notes.delete_one({"id": note_id})
    return {"message": "Note deleted"}

# ============ BUDGET SHEETS ROUTES ============

# --- Sheet CRUD ---

@api_router.get("/budget/sheets")
async def get_sheets(user: dict = Depends(get_current_user)):
    sheets = await db.budget_sheets.find({"user_id": user["id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    return sheets

@api_router.post("/budget/sheets")
async def create_sheet(data: BudgetSheetCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    count = await db.budget_sheets.count_documents({"user_id": user["id"]})
    sheet_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": data.name,
        "order": count,
        "created_at": now
    }
    await db.budget_sheets.insert_one(sheet_doc)
    sheet_doc.pop('_id', None)
    return sheet_doc

@api_router.put("/budget/sheets/{sheet_id}")
async def update_sheet(sheet_id: str, data: BudgetSheetUpdate, user: dict = Depends(get_current_user)):
    sheet = await db.budget_sheets.find_one({"id": sheet_id, "user_id": user["id"]})
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.budget_sheets.update_one({"id": sheet_id}, {"$set": update_data})
    updated = await db.budget_sheets.find_one({"id": sheet_id}, {"_id": 0})
    return updated

@api_router.delete("/budget/sheets/{sheet_id}")
async def delete_sheet(sheet_id: str, user: dict = Depends(get_current_user)):
    sheet = await db.budget_sheets.find_one({"id": sheet_id, "user_id": user["id"]})
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    await db.budget_rows.delete_many({"sheet_id": sheet_id, "user_id": user["id"]})
    await db.budget_sheets.delete_one({"id": sheet_id})
    return {"message": "Sheet and all its rows deleted"}

# --- Row CRUD ---

@api_router.get("/budget/sheets/{sheet_id}/rows")
async def get_rows(sheet_id: str, user: dict = Depends(get_current_user)):
    rows = await db.budget_rows.find({"sheet_id": sheet_id, "user_id": user["id"]}, {"_id": 0}).sort("order", 1).to_list(5000)
    return rows

@api_router.post("/budget/sheets/{sheet_id}/rows")
async def create_row(sheet_id: str, data: BudgetRowCreate, user: dict = Depends(get_current_user)):
    sheet = await db.budget_sheets.find_one({"id": sheet_id, "user_id": user["id"]})
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    count = await db.budget_rows.count_documents({"sheet_id": sheet_id, "user_id": user["id"]})
    row_doc = {
        "id": str(uuid.uuid4()),
        "sheet_id": sheet_id,
        "user_id": user["id"],
        "date": data.date,
        "description": data.description,
        "credit": data.credit,
        "debit": data.debit,
        "order": count,
        "created_at": now
    }
    await db.budget_rows.insert_one(row_doc)
    row_doc.pop('_id', None)
    return row_doc

@api_router.put("/budget/rows/{row_id}")
async def update_row(row_id: str, data: BudgetRowUpdate, user: dict = Depends(get_current_user)):
    row = await db.budget_rows.find_one({"id": row_id, "user_id": user["id"]})
    if not row:
        raise HTTPException(status_code=404, detail="Row not found")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.budget_rows.update_one({"id": row_id}, {"$set": update_data})
    updated = await db.budget_rows.find_one({"id": row_id}, {"_id": 0})
    return updated

@api_router.delete("/budget/rows/{row_id}")
async def delete_row(row_id: str, user: dict = Depends(get_current_user)):
    result = await db.budget_rows.delete_one({"id": row_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Row not found")
    return {"message": "Row deleted"}

# --- Import / Export ---

@api_router.post("/budget/sheets/{sheet_id}/import")
async def import_sheet_csv(sheet_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Import CSV into a sheet. Columns: date, source/description, debit, credit"""
    sheet = await db.budget_sheets.find_one({"id": sheet_id, "user_id": user["id"]})
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    try:
        content = await file.read()
        try:
            text = content.decode('utf-8-sig')
        except UnicodeDecodeError:
            text = content.decode('latin-1')
        
        reader = csv.DictReader(io.StringIO(text))
        
        imported = 0
        now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
        current_order = await db.budget_rows.count_documents({"sheet_id": sheet_id, "user_id": user["id"]})
        
        for row in reader:
            row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
            
            raw_date = row.get('date', '').strip()
            description = row.get('source', row.get('description', '')).strip()
            
            debit_str = row.get('debit', '').replace(',', '').strip()
            credit_str = row.get('credit', '').replace(',', '').strip()
            
            debit = 0
            credit = 0
            try:
                debit = float(debit_str) if debit_str else 0
            except ValueError:
                pass
            try:
                credit = float(credit_str) if credit_str else 0
            except ValueError:
                pass
            
            if not raw_date and not description and debit == 0 and credit == 0:
                continue
            
            row_doc = {
                "id": str(uuid.uuid4()),
                "sheet_id": sheet_id,
                "user_id": user["id"],
                "date": raw_date,
                "description": description,
                "credit": credit,
                "debit": debit,
                "order": current_order + imported,
                "created_at": now
            }
            
            await db.budget_rows.insert_one(row_doc)
            imported += 1
        
        return {"message": f"Imported {imported} rows", "count": imported}
    except Exception as e:
        logger.error(f"CSV import error: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

@api_router.get("/budget/sheets/{sheet_id}/export")
async def export_sheet_csv(sheet_id: str, user: dict = Depends(get_current_user)):
    from fastapi.responses import StreamingResponse
    sheet = await db.budget_sheets.find_one({"id": sheet_id, "user_id": user["id"]})
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    
    rows = await db.budget_rows.find({"sheet_id": sheet_id, "user_id": user["id"]}, {"_id": 0}).sort("order", 1).to_list(5000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Credit", "Debit"])
    for r in rows:
        writer.writerow([r.get("date", ""), r.get("description", ""), r.get("credit", 0), r.get("debit", 0)])
    
    output.seek(0)
    filename = f"{sheet['name'].replace(' ', '_')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )




# ============ FOCUS ROUTES ============

@api_router.post("/focus/start", response_model=FocusSessionResponse)
async def start_focus_session(data: FocusSessionCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    session_id = str(uuid.uuid4())
    
    session_doc = {
        "id": session_id,
        "user_id": user["id"],
        "duration_planned": data.duration_planned,
        "duration_actual": None,
        "started_at": now,
        "completed_at": None,
        "interrupted": False,
    }
    
    await db.focus_sessions.insert_one(session_doc)
    
    return FocusSessionResponse(**session_doc)

@api_router.patch("/focus/{session_id}/complete", response_model=FocusSessionResponse)
async def complete_focus_session(session_id: str, data: FocusSessionComplete, user: dict = Depends(get_current_user)):
    session = await db.focus_sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    
    await db.focus_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "duration_actual": data.duration_actual,
            "completed_at": now,
            "interrupted": data.interrupted,
        }}
    )
    
    # Only award XP and update stats for naturally completed sessions
    if not data.interrupted:
        await add_xp(user["id"], 25)
        await update_daily_activity(user["id"], "focus_time", data.duration_actual)
        await update_streak(user["id"])
        await check_achievements(user["id"])
    
    updated_session = await db.focus_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated_session

@api_router.get("/focus/sessions", response_model=List[FocusSessionResponse])
async def get_focus_sessions(user: dict = Depends(get_current_user)):
    sessions = await db.focus_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("started_at", -1).to_list(100)
    return sessions

@api_router.get("/focus/stats")
async def get_focus_stats(user: dict = Depends(get_current_user)):
    # Only count sessions that completed naturally (not interrupted/reset)
    sessions = await db.focus_sessions.find(
        {"user_id": user["id"], "completed_at": {"$ne": None}, "interrupted": False},
        {"_id": 0}
    ).to_list(1000)
    
    total_time = sum(s.get("duration_actual", 0) for s in sessions)
    total_sessions = len(sessions)
    
    today = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")
    today_sessions = [s for s in sessions if s["started_at"].startswith(today)]
    today_time = sum(s.get("duration_actual", 0) for s in today_sessions)
    
    return {
        "total_focus_time": total_time,
        "total_sessions": total_sessions,
        "today_focus_time": today_time,
        "today_sessions": len(today_sessions)
    }

# ============ HABIT ROUTES ============

@api_router.get("/habits", response_model=List[HabitResponse])
async def get_habits(user: dict = Depends(get_current_user)):
    """Get all habits for user. Auto-resets completion status if new day."""
    today = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")
    habits = await db.habits.find({"user_id": user["id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    
    updated_habits = []
    for habit in habits:
        # Auto-reset if last_completed_date is not today and is_completed is True
        last_date = habit.get("last_completed_date", "")
        if habit.get("is_completed", False) and last_date != today:
            # Reset to pending (new day)
            await db.habits.update_one(
                {"id": habit["id"]},
                {"$set": {"is_completed": False}}
            )
            habit["is_completed"] = False
        updated_habits.append(habit)
    
    return updated_habits

@api_router.post("/habits", response_model=HabitResponse)
async def create_habit(data: HabitCreate, user: dict = Depends(get_current_user)):
    """Create a new habit."""
    now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    habit_id = str(uuid.uuid4())
    
    # Get max order for user's habits
    max_order_habit = await db.habits.find_one(
        {"user_id": user["id"]},
        sort=[("order", -1)]
    )
    next_order = (max_order_habit.get("order", 0) + 1) if max_order_habit else 0
    
    habit_doc = {
        "id": habit_id,
        "user_id": user["id"],
        "title": data.title,
        "icon": data.icon or "☀️",
        "order": data.order if data.order is not None else next_order,
        "is_completed": False,
        "last_completed_date": None,
        "current_streak": 0,
        "created_at": now
    }
    
    await db.habits.insert_one(habit_doc)
    return HabitResponse(**habit_doc)

@api_router.put("/habits/{habit_id}", response_model=HabitResponse)
async def update_habit(habit_id: str, data: HabitUpdate, user: dict = Depends(get_current_user)):
    """Update a habit. Toggle completion updates streak."""
    habit = await db.habits.find_one({"id": habit_id, "user_id": user["id"]}, {"_id": 0})
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title
    if data.icon is not None:
        update_data["icon"] = data.icon
    if data.order is not None:
        update_data["order"] = data.order
    
    # Handle completion toggle with streak logic
    if data.is_completed is not None:
        today = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")
        yesterday = (datetime.now(ZoneInfo("Asia/Kolkata")) - timedelta(days=1)).strftime("%Y-%m-%d")
        
        if data.is_completed:
            # Marking as complete
            update_data["is_completed"] = True
            update_data["last_completed_date"] = today
            
            # Update streak: if last completed was yesterday, increment; otherwise reset to 1
            last_date = habit.get("last_completed_date", "")
            if last_date == yesterday:
                update_data["current_streak"] = habit.get("current_streak", 0) + 1
            elif last_date != today:
                update_data["current_streak"] = 1
        else:
            # Marking as incomplete (undo)
            update_data["is_completed"] = False
    
    if update_data:
        await db.habits.update_one({"id": habit_id}, {"$set": update_data})
    
    updated_habit = await db.habits.find_one({"id": habit_id}, {"_id": 0})
    return HabitResponse(**updated_habit)

@api_router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: str, user: dict = Depends(get_current_user)):
    """Delete a habit."""
    result = await db.habits.delete_one({"id": habit_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"message": "Habit deleted"}

@api_router.put("/habits/reorder")
async def reorder_habits(data: HabitReorder, user: dict = Depends(get_current_user)):
    """Reorder habits by providing list of habit IDs in desired order."""
    for index, habit_id in enumerate(data.habit_ids):
        await db.habits.update_one(
            {"id": habit_id, "user_id": user["id"]},
            {"$set": {"order": index}}
        )
    return {"message": "Habits reordered"}

# ============ DASHBOARD ROUTES ============

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    notes_count = await db.notes.count_documents({"user_id": user["id"]})
    
    all_activities = await db.daily_activity.find({"user_id": user["id"]}, {"_id": 0}).to_list(10000)
    total_tasks_completed = sum(a.get("tasks_completed", 0) for a in all_activities)
    
    total_focus_time = sum(
        s.get("duration_actual", 0)
        for s in await db.focus_sessions.find(
            {"user_id": user["id"], "completed_at": {"$ne": None}, "interrupted": False},
            {"_id": 0}
        ).to_list(10000)
    )
    
    return DashboardStats(
        current_streak=user_data.get("current_streak", 0),
        longest_streak=user_data.get("longest_streak", 0),
        total_xp=user_data.get("total_xp", 0),
        current_level=user_data.get("current_level", 1),
        notes_count=notes_count,
        total_tasks_completed=total_tasks_completed,
        total_focus_time=total_focus_time,
    )

@api_router.get("/dashboard/activity", response_model=List[DailyActivityResponse])
async def get_activity_data(days: int = 365, user: dict = Depends(get_current_user)):
    start_date = (datetime.now(ZoneInfo("Asia/Kolkata")) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    activities = await db.daily_activity.find(
        {"user_id": user["id"], "date": {"$gte": start_date}},
        {"_id": 0}
    ).sort("date", 1).to_list(days)
    
    return activities
import asyncio

@api_router.get("/preload")
async def preload_data(since: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Fetch core data in a single round-trip to reduce initial load latency."""
    uid = user["id"]

    async def _tasks():
        query = {"user_id": uid}
        if since:
            query["updated_at"] = {"$gte": since}
        return await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

    async def _notes():
        query = {"user_id": uid}
        if since:
            query["updated_at"] = {"$gte": since}
        notes = await db.notes.find(
            query,
            {"_id": 0, "content": 0}  # Exclude heavy content field for speed
        ).sort("updated_at", -1).to_list(1000)
        for n in notes:
            if "categories" not in n:
                n["categories"] = [n.pop("category", "general")] if isinstance(n.get("category"), str) else n.get("category", ["general"])
        return notes

    async def _sheets():
        query = {"user_id": uid}
        if since:
            # Budget sheets only track created_at currently
            query["created_at"] = {"$gte": since}
        return await db.budget_sheets.find(query, {"_id": 0}).sort("order", 1).to_list(100)

    tasks, notes, sheets = await asyncio.gather(_tasks(), _notes(), _sheets())

    return {
        "tasks": tasks,
        "notes": notes,
        "budget_sheets": sheets,
        "server_time": datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    }

@api_router.get("/")
async def root():
    return {"message": "LifeOS API is running"}

# ============ ACHIEVEMENTS ============

ACHIEVEMENTS = [
    {"id": "first_step", "name": "First Step", "description": "Complete your first task", "type": "task", "requirement": 1, "xp_reward": 50, "badge_icon": "check"},
    {"id": "centurion", "name": "Centurion", "description": "Complete 100 tasks", "type": "task", "requirement": 100, "xp_reward": 500, "badge_icon": "trophy"},
    {"id": "task_master", "name": "Task Master", "description": "Complete 1000 tasks", "type": "task", "requirement": 1000, "xp_reward": 2000, "badge_icon": "crown"},
    {"id": "getting_warm", "name": "Getting Warm", "description": "Maintain a 3 day streak", "type": "streak", "requirement": 3, "xp_reward": 100, "badge_icon": "flame"},
    {"id": "on_fire", "name": "On Fire", "description": "Maintain a 7 day streak", "type": "streak", "requirement": 7, "xp_reward": 250, "badge_icon": "flame"},
    {"id": "blazing", "name": "Blazing", "description": "Maintain a 30 day streak", "type": "streak", "requirement": 30, "xp_reward": 1000, "badge_icon": "flame"},
    {"id": "focused_mind", "name": "Focused Mind", "description": "Complete 10 focus sessions", "type": "focus", "requirement": 10, "xp_reward": 200, "badge_icon": "clock"},
    {"id": "deep_work", "name": "Deep Work", "description": "100 hours of focus time", "type": "focus_hours", "requirement": 6000, "xp_reward": 1000, "badge_icon": "brain"},
    {"id": "note_taker", "name": "Note Taker", "description": "Create 50 notes", "type": "notes", "requirement": 50, "xp_reward": 200, "badge_icon": "file-text"},
]

# Helper to check and unlock achievements for user
async def check_achievements(user_id: str):
    user_data = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user_data:
        return
    
    all_activities = await db.daily_activity.find({"user_id": user_id}, {"_id": 0}).to_list(10000)
    tasks_completed = sum(a.get("tasks_completed", 0) for a in all_activities)
    focus_sessions = await db.focus_sessions.count_documents({"user_id": user_id, "completed_at": {"$ne": None}, "interrupted": False})
    notes_count = await db.notes.count_documents({"user_id": user_id})
    current_streak = user_data.get("longest_streak", 0)
    sessions = await db.focus_sessions.find({"user_id": user_id, "completed_at": {"$ne": None}, "interrupted": False}, {"_id": 0}).to_list(10000)
    total_focus_minutes = sum(s.get("duration_actual", 0) for s in sessions)
    
    user_achievements = await db.user_achievements.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    unlocked_ids = {ua["achievement_id"] for ua in user_achievements}
    
    for ach in ACHIEVEMENTS:
        if ach["id"] in unlocked_ids:
            continue
        unlocked = False
        if ach["type"] == "task":
            unlocked = tasks_completed >= ach["requirement"]
        elif ach["type"] == "streak":
            unlocked = current_streak >= ach["requirement"]
        elif ach["type"] == "focus":
            unlocked = focus_sessions >= ach["requirement"]
        elif ach["type"] == "focus_hours":
            unlocked = total_focus_minutes >= ach["requirement"]
        elif ach["type"] == "notes":
            unlocked = notes_count >= ach["requirement"]
        
        if unlocked:
            now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
            await db.user_achievements.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "achievement_id": ach["id"],
                "unlocked_at": now
            })
            await add_xp(user_id, ach["xp_reward"])

@api_router.get("/achievements", response_model=List[AchievementResponse])
async def get_achievements(user: dict = Depends(get_current_user)):
    # Get user stats
    tasks_completed = await db.tasks.count_documents({"user_id": user["id"], "status": "completed"})
    focus_sessions = await db.focus_sessions.count_documents({"user_id": user["id"], "completed_at": {"$ne": None}, "interrupted": False})
    notes_count = await db.notes.count_documents({"user_id": user["id"]})
    
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    current_streak = user_data.get("longest_streak", 0)
    
    # Calculate total focus hours
    sessions = await db.focus_sessions.find({"user_id": user["id"], "completed_at": {"$ne": None}, "interrupted": False}, {"_id": 0}).to_list(1000)
    total_focus_minutes = sum(s.get("duration_actual", 0) for s in sessions)
    
    # Get unlocked achievements
    user_achievements = await db.user_achievements.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    unlocked_ids = {ua["achievement_id"]: ua["unlocked_at"] for ua in user_achievements}
    
    result = []
    for ach in ACHIEVEMENTS:
        unlocked = False
        if ach["type"] == "task":
            unlocked = tasks_completed >= ach["requirement"]
        elif ach["type"] == "streak":
            unlocked = current_streak >= ach["requirement"]
        elif ach["type"] == "focus":
            unlocked = focus_sessions >= ach["requirement"]
        elif ach["type"] == "focus_hours":
            unlocked = total_focus_minutes >= ach["requirement"]
        elif ach["type"] == "notes":
            unlocked = notes_count >= ach["requirement"]
        
        # Check if already in db and if not, add it
        if unlocked and ach["id"] not in unlocked_ids:
            now = datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
            await db.user_achievements.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "achievement_id": ach["id"],
                "unlocked_at": now
            })
            await add_xp(user["id"], ach["xp_reward"])
            unlocked_ids[ach["id"]] = now
        
        result.append(AchievementResponse(
            id=ach["id"],
            name=ach["name"],
            description=ach["description"],
            type=ach["type"],
            requirement=ach["requirement"],
            xp_reward=ach["xp_reward"],
            badge_icon=ach["badge_icon"],
            unlocked=ach["id"] in unlocked_ids,
            unlocked_at=unlocked_ids.get(ach["id"])
        ))
    
    return result

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[origin.strip() for origin in os.environ.get('CORS_ORIGINS', '').split(',') if origin.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directory exists
static_dir = ROOT_DIR / "static"
static_dir.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Include router
app.include_router(api_router)

@app.on_event("startup")
async def startup_db_client():
    try:
        await client.admin.command("ping")
        logger.info(f"✅ Successfully connected to MongoDB database: '{os.environ['DB_NAME']}'")
        
        # Create indexes for performance
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True)

        # Task indexes
        await db.tasks.create_index([("user_id", 1), ("status", 1)])
        await db.tasks.create_index([("user_id", 1), ("due_date", 1)])
        await db.tasks.create_index([("user_id", 1), ("is_pinned", -1), ("created_at", -1)])
        await db.tasks.create_index("user_id")

        # Note indexes
        await db.notes.create_index("user_id")
        await db.notes.create_index([("user_id", 1), ("parent_id", 1)])
        await db.notes.create_index([("user_id", 1), ("is_favorite", -1)])

        # Budget indexes
        await db.budget_sheets.create_index("user_id")
        await db.budget_rows.create_index([("sheet_id", 1), ("user_id", 1)])

        # Focus & habits indexes
        await db.focus_sessions.create_index([("user_id", 1), ("completed_at", -1)])
        await db.focus_sessions.create_index([("user_id", 1), ("started_at", -1)])
        await db.habits.create_index([("user_id", 1), ("order", 1)])

        # Activity & achievements indexes
        await db.daily_activity.create_index([("user_id", 1), ("date", -1)], unique=True)
        await db.user_achievements.create_index([("user_id", 1), ("achievement_id", 1)], unique=True)
        logger.info("✅ Database indexes ensured")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("🔌 MongoDB connection closed")

# Startup for local development and production
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)

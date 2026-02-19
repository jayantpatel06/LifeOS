from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import csv
import io
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import certifi

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'lifeos-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

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
    initial_balance: float = 0.0
    is_initial_balance_set: bool = False
    custom_note_labels: List[str] = []
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    category: str = "daily"  # daily, weekly, high_priority
    priority: int = 1
    estimated_time: Optional[int] = None
    due_date: Optional[str] = None
    tags: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    estimated_time: Optional[int] = None
    due_date: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class TaskResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    description: str
    category: str
    priority: int
    status: str
    estimated_time: Optional[int]
    actual_time: Optional[int]
    due_date: Optional[str]
    completed_at: Optional[str]
    tags: List[str]
    created_at: str
    updated_at: str

class NoteCreate(BaseModel):
    title: str
    content: str = ""
    categories: List[str] = ["general"]  # study, budget, general, quick
    is_favorite: bool = False

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    categories: Optional[List[str]] = None
    is_favorite: Optional[bool] = None

class NoteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    title: str
    content: str
    categories: List[str] = ["general"]
    tags: List[str] = []
    is_favorite: bool
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
    task_id: Optional[str] = None

class FocusSessionComplete(BaseModel):
    duration_actual: int
    interrupted: bool = False

class FocusSessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    task_id: Optional[str]
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
    expenses_logged: int
    completion_percentage: int

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
    tasks_completed_today: int
    tasks_total_today: int
    focus_time_today: int
    notes_count: int
    weekly_completion_rate: float
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
    current_streak: int = 0
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
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
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
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    
    # Check if user completed at least one task today
    tasks_today = await db.tasks.count_documents({
        "user_id": user_id,
        "status": "completed",
        "completed_at": {"$regex": f"^{today}"}
    })
    
    if tasks_today > 0:
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
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
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
            "expenses_logged": 0,
            "completion_percentage": 0
        }
        activity[field] = increment
        await db.daily_activity.insert_one(activity)

# ============ AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": data.username}, {"_id": 0})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
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
        "initial_balance": 0.0,
        "is_initial_balance_set": False,
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
        initial_balance=0.0,
        is_initial_balance_set=False,
        custom_note_labels=[],
        created_at=now
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
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
        initial_balance=user.get("initial_balance", 0.0),
        custom_note_labels=user.get("custom_note_labels", []),
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
        initial_balance=user.get("initial_balance", 0.0),
        custom_note_labels=user.get("custom_note_labels", []),
        created_at=user["created_at"]
    )

class LabelUpdate(BaseModel):
    labels: List[str]

@api_router.put("/auth/labels", response_model=UserResponse)
async def update_labels(data: LabelUpdate, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"custom_note_labels": data.labels}}
    )
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        username=updated_user["username"],
        current_level=updated_user.get("current_level", 1),
        total_xp=updated_user.get("total_xp", 0),
        current_streak=updated_user.get("current_streak", 0),
        longest_streak=updated_user.get("longest_streak", 0),
        initial_balance=updated_user.get("initial_balance", 0.0),
        is_initial_balance_set=updated_user.get("is_initial_balance_set", False),
        custom_note_labels=updated_user.get("custom_note_labels", []),
        created_at=updated_user["created_at"]
    )

class BalanceUpdate(BaseModel):
    initial_balance: float

@api_router.put("/auth/balance", response_model=UserResponse)
async def update_balance(data: BalanceUpdate, user: dict = Depends(get_current_user)):
    # Check if already set
    current_user = await db.users.find_one({"id": user["id"]})
    if current_user.get("is_initial_balance_set", False):
        raise HTTPException(status_code=400, detail="Initial balance can only be set once")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "initial_balance": data.initial_balance, 
            "is_initial_balance_set": True
        }}
    )
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        username=updated_user["username"],
        current_level=updated_user.get("current_level", 1),
        total_xp=updated_user.get("total_xp", 0),
        current_streak=updated_user.get("current_streak", 0),
        longest_streak=updated_user.get("longest_streak", 0),
        initial_balance=updated_user.get("initial_balance", 0.0),
        is_initial_balance_set=updated_user.get("is_initial_balance_set", True),
        created_at=updated_user["created_at"]
    )

# ============ TASK ROUTES ============

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(category: Optional[str] = None, status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tasks

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(data: TaskCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    task_id = str(uuid.uuid4())
    
    task_doc = {
        "id": task_id,
        "user_id": user["id"],
        "title": data.title,
        "description": data.description or "",
        "category": data.category,
        "priority": data.priority,
        "status": "pending",
        "estimated_time": data.estimated_time,
        "actual_time": None,
        "due_date": data.due_date,
        "completed_at": None,
        "tags": data.tags,
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
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return updated_task

@api_router.patch("/tasks/{task_id}/complete", response_model=TaskResponse)
async def complete_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id, "user_id": user["id"]}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
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
    now = datetime.now(timezone.utc).isoformat()
    note_id = str(uuid.uuid4())
    
    note_doc = {
        "id": note_id,
        "user_id": user["id"],
        "title": data.title,
        "content": data.content,
        "categories": data.categories,
        "is_favorite": data.is_favorite,
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
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.notes.update_one({"id": note_id}, {"$set": update_data})
    
    updated_note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if "categories" not in updated_note:
        updated_note["categories"] = [updated_note.pop("category", "general")] if isinstance(updated_note.get("category"), str) else updated_note.get("category", ["general"])
    return updated_note

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(get_current_user)):
    result = await db.notes.delete_one({"id": note_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ============ BUDGET SHEETS ROUTES ============

# --- Sheet CRUD ---

@api_router.get("/budget/sheets")
async def get_sheets(user: dict = Depends(get_current_user)):
    sheets = await db.budget_sheets.find({"user_id": user["id"]}, {"_id": 0}).sort("order", 1).to_list(100)
    return sheets

@api_router.post("/budget/sheets")
async def create_sheet(data: BudgetSheetCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
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
    now = datetime.now(timezone.utc).isoformat()
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
        now = datetime.now(timezone.utc).isoformat()
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
    now = datetime.now(timezone.utc).isoformat()
    session_id = str(uuid.uuid4())
    
    session_doc = {
        "id": session_id,
        "user_id": user["id"],
        "task_id": data.task_id,
        "duration_planned": data.duration_planned,
        "duration_actual": None,
        "started_at": now,
        "completed_at": None,
        "interrupted": False
    }
    
    await db.focus_sessions.insert_one(session_doc)
    
    return FocusSessionResponse(**session_doc)

@api_router.patch("/focus/{session_id}/complete", response_model=FocusSessionResponse)
async def complete_focus_session(session_id: str, data: FocusSessionComplete, user: dict = Depends(get_current_user)):
    session = await db.focus_sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.focus_sessions.update_one(
        {"id": session_id},
        {"$set": {
            "duration_actual": data.duration_actual,
            "completed_at": now,
            "interrupted": data.interrupted
        }}
    )
    
    # Award XP for completing focus session
    if not data.interrupted:
        await add_xp(user["id"], 25)
    
    await update_daily_activity(user["id"], "focus_time", data.duration_actual)
    
    updated_session = await db.focus_sessions.find_one({"id": session_id}, {"_id": 0})
    return updated_session

@api_router.get("/focus/sessions", response_model=List[FocusSessionResponse])
async def get_focus_sessions(user: dict = Depends(get_current_user)):
    sessions = await db.focus_sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("started_at", -1).to_list(100)
    return sessions

@api_router.get("/focus/stats")
async def get_focus_stats(user: dict = Depends(get_current_user)):
    sessions = await db.focus_sessions.find(
        {"user_id": user["id"], "completed_at": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    total_time = sum(s.get("duration_actual", 0) for s in sessions)
    completed_sessions = len([s for s in sessions if not s.get("interrupted", False)])
    total_sessions = len(sessions)
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_sessions = [s for s in sessions if s["started_at"].startswith(today)]
    today_time = sum(s.get("duration_actual", 0) for s in today_sessions)
    
    return {
        "total_focus_time": total_time,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0,
        "today_focus_time": today_time,
        "today_sessions": len(today_sessions)
    }

# ============ HABIT ROUTES ============

@api_router.get("/habits", response_model=List[HabitResponse])
async def get_habits(user: dict = Depends(get_current_user)):
    """Get all habits for user. Auto-resets completion status if new day."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
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
    now = datetime.now(timezone.utc).isoformat()
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
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        
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
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")
    
    # Tasks today
    tasks_today = await db.tasks.find({
        "user_id": user["id"],
        "$or": [
            {"due_date": {"$regex": f"^{today}"}},
            {"category": "daily"}
        ]
    }, {"_id": 0}).to_list(1000)
    
    tasks_completed_today = len([t for t in tasks_today if t["status"] == "completed"])
    
    # Weekly completion rate
    weekly_tasks = await db.tasks.find({
        "user_id": user["id"],
        "created_at": {"$gte": week_ago}
    }, {"_id": 0}).to_list(1000)
    
    weekly_completed = len([t for t in weekly_tasks if t["status"] == "completed"])
    weekly_rate = (weekly_completed / len(weekly_tasks) * 100) if weekly_tasks else 0
    
    # Focus time today
    today_activity = await db.daily_activity.find_one({"user_id": user["id"], "date": today}, {"_id": 0})
    focus_time_today = today_activity.get("focus_time", 0) if today_activity else 0
    
    # Notes count
    notes_count = await db.notes.count_documents({"user_id": user["id"]})
    
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    return DashboardStats(
        current_streak=user_data.get("current_streak", 0),
        longest_streak=user_data.get("longest_streak", 0),
        total_xp=user_data.get("total_xp", 0),
        current_level=user_data.get("current_level", 1),
        tasks_completed_today=tasks_completed_today,
        tasks_total_today=len(tasks_today),
        focus_time_today=focus_time_today,
        notes_count=notes_count,
        weekly_completion_rate=round(weekly_rate, 1),
        total_tasks_completed=await db.tasks.count_documents({"user_id": user["id"], "status": "completed"}),
        total_focus_time=sum(s.get("duration_actual", 0) for s in await db.focus_sessions.find({"user_id": user["id"], "completed_at": {"$ne": None}}, {"_id": 0}).to_list(10000))
    )

@api_router.get("/dashboard/activity", response_model=List[DailyActivityResponse])
async def get_activity_data(days: int = 365, user: dict = Depends(get_current_user)):
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    
    activities = await db.daily_activity.find(
        {"user_id": user["id"], "date": {"$gte": start_date}},
        {"_id": 0}
    ).sort("date", 1).to_list(days)
    
    return activities

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

@api_router.get("/achievements", response_model=List[AchievementResponse])
async def get_achievements(user: dict = Depends(get_current_user)):
    # Get user stats
    tasks_completed = await db.tasks.count_documents({"user_id": user["id"], "status": "completed"})
    focus_sessions = await db.focus_sessions.count_documents({"user_id": user["id"], "completed_at": {"$ne": None}, "interrupted": False})
    notes_count = await db.notes.count_documents({"user_id": user["id"]})
    
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    current_streak = user_data.get("longest_streak", 0)
    
    # Calculate total focus hours
    sessions = await db.focus_sessions.find({"user_id": user["id"], "completed_at": {"$ne": None}}, {"_id": 0}).to_list(1000)
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
            now = datetime.now(timezone.utc).isoformat()
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
    allow_origins=[origin.strip() for origin in os.environ.get('CORS_ORIGINS', '*').split(',')],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(api_router)

@app.on_event("startup")
async def startup_db_client():
    try:
        await client.admin.command("ping")
        logger.info(f"✅ Successfully connected to MongoDB database: '{os.environ['DB_NAME']}'")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("🔌 MongoDB connection closed")

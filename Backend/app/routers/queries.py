from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_user, AuthContext
from app.db.mongodb import db
from app.enums.role import Role
from app.repositories.manager_repository import ManagerRepository
from app.repositories.user_repository import UserRepository
from app.utils.mongo_serializer import serialize_mongo


router = APIRouter(prefix="/queries", tags=["Queries"])
user_repo = UserRepository()
manager_repo = ManagerRepository()


class SendMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ReadStatusRequest(BaseModel):
    read: bool = True


async def _get_user_manager_pair(user_id: str):
    user = await user_repo.find_by_id(user_id)
    if not user:
        raise ValueError("User not found")

    mgr = user.get("approved_by_manager_id")
    if not mgr:
        raise ValueError("No approving bank manager found")

    return user, str(mgr)


@router.get("/me/manager")
async def my_bank_manager(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        _, manager_object_id = await _get_user_manager_pair(auth.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not ObjectId.is_valid(manager_object_id):
        raise HTTPException(status_code=404, detail="Manager not found")

    manager = await manager_repo.collection.find_one({"_id": ObjectId(manager_object_id)})
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")

    return {
        "manager_id": str(manager["_id"]),
        "name": manager.get("name"),
        "phone": manager.get("phone"),
        "role": manager.get("role"),
    }


@router.get("/me")
async def list_my_messages(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        _, manager_object_id = await _get_user_manager_pair(auth.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    cursor = (
        db.query_messages
        .find({"user_id": ObjectId(auth.user_id), "manager_id": ObjectId(manager_object_id)})
        .sort("created_at", 1)
        .limit(500)
    )

    items = []
    async for m in cursor:
        items.append(m)

    return {"messages": serialize_mongo(items)}


@router.post("/me", status_code=status.HTTP_201_CREATED)
async def send_my_message(
    payload: SendMessageRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.USER:
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        _, manager_object_id = await _get_user_manager_pair(auth.user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    doc = {
        "user_id": ObjectId(auth.user_id),
        "manager_id": ObjectId(manager_object_id),
        "sender_role": "USER",
        "message": payload.message.strip(),
        "created_at": datetime.utcnow(),
        "is_read_by_manager": False,
        "is_read_by_user": True,
    }
    await db.query_messages.insert_one(doc)
    return {"message": "Sent"}


@router.get("")
async def list_manager_conversations(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")

    # Find users approved by this manager
    cursor = user_repo.collection.find({"approved_by_manager_id": ObjectId(auth.user_id)})

    users = []
    async for u in cursor:
        users.append({
            "user_id": str(u["_id"]),
            "name": u.get("name"),
            "phone": u.get("phone"),
            "approval_status": u.get("approval_status"),
            "kyc_status": u.get("kyc_status"),
        })

    return {"users": users}


@router.get("/manager/conversations")
async def list_manager_conversations_with_messages(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")

    pipeline = [
        {"$match": {"manager_id": ObjectId(auth.user_id)}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$user_id",
            "last_message": {"$first": "$message"},
            "last_message_at": {"$first": "$created_at"},
            "unread_count": {
                "$sum": {
                    "$cond": [
                        {
                            "$and": [
                                {"$eq": ["$sender_role", "USER"]},
                                {"$ne": ["$is_read_by_manager", True]}
                            ]
                        },
                        1,
                        0
                    ]
                }
            }
        }},
        {"$sort": {"last_message_at": -1}},
        {"$limit": 500},
    ]

    cursor = db.query_messages.aggregate(pipeline)
    items = []
    async for row in cursor:
        user_id = row.get("_id")
        if not user_id:
            continue
        user = await user_repo.find_by_id(str(user_id))
        items.append({
            "user_id": str(user_id),
            "name": user.get("name") if user else None,
            "phone": user.get("phone") if user else None,
            "last_message": row.get("last_message"),
            "last_message_at": row.get("last_message_at").isoformat() if row.get("last_message_at") else None,
            "unread_count": row.get("unread_count", 0),
        })

    return {"conversations": items}


@router.get("/{user_id}")
async def list_messages_for_user(
    user_id: str,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure this manager is the approving manager for that user
    user = await user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if str(user.get("approved_by_manager_id")) != str(auth.user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    cursor = (
        db.query_messages
        .find({"user_id": ObjectId(user_id), "manager_id": ObjectId(auth.user_id)})
        .sort("created_at", 1)
        .limit(500)
    )

    items = []
    async for m in cursor:
        items.append(m)

    return {"messages": serialize_mongo(items)}


@router.post("/{user_id}", status_code=status.HTTP_201_CREATED)
async def reply_to_user(
    user_id: str,
    payload: SendMessageRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    user = await user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if str(user.get("approved_by_manager_id")) != str(auth.user_id):
        raise HTTPException(status_code=403, detail="Access denied")

    doc = {
        "user_id": ObjectId(user_id),
        "manager_id": ObjectId(auth.user_id),
        "sender_role": "BANK_MANAGER",
        "message": payload.message.strip(),
        "created_at": datetime.utcnow(),
        "is_read_by_manager": True,
        "is_read_by_user": False,
    }
    await db.query_messages.insert_one(doc)
    return {"message": "Sent"}


@router.get("/manager/notifications")
async def list_manager_notifications(auth: AuthContext = Depends(get_current_user)):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")

    cursor = (
        db.query_messages
        .find({
            "manager_id": ObjectId(auth.user_id),
            "sender_role": "USER",
            "is_read_by_manager": {"$ne": True}
        })
        .sort("created_at", 1)
        .limit(1000)
    )

    grouped = {}
    async for m in cursor:
        uid = str(m.get("user_id"))
        if not uid:
            continue
        entry = grouped.setdefault(uid, {
            "user_id": uid,
            "unread_count": 0,
            "last_message": None,
            "last_created_at": None,
            "last_message_id": None,
        })
        entry["unread_count"] += 1
        entry["last_message"] = m.get("message")
        entry["last_created_at"] = m.get("created_at")
        entry["last_message_id"] = str(m.get("_id"))

    items = []
    total_unread = 0
    for uid, entry in grouped.items():
        total_unread += entry["unread_count"]
        user = await user_repo.find_by_id(uid)
        items.append({
            **entry,
            "name": user.get("name") if user else None,
            "phone": user.get("phone") if user else None,
            "last_created_at": entry["last_created_at"].isoformat() if entry["last_created_at"] else None
        })

    items.sort(key=lambda x: x.get("last_created_at") or "", reverse=True)
    return {"total_unread": total_unread, "items": items}


@router.patch("/manager/messages/{message_id}/read")
async def mark_message_read_state(
    message_id: str,
    payload: ReadStatusRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")

    if not ObjectId.is_valid(message_id):
        raise HTTPException(status_code=404, detail="Message not found")

    msg = await db.query_messages.find_one({"_id": ObjectId(message_id)})
    if not msg or str(msg.get("manager_id")) != str(auth.user_id):
        raise HTTPException(status_code=404, detail="Message not found")

    await db.query_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"is_read_by_manager": bool(payload.read)}}
    )
    return {"message": "Updated"}


@router.patch("/manager/users/{user_id}/read")
async def mark_user_messages_read_state(
    user_id: str,
    payload: ReadStatusRequest,
    auth: AuthContext = Depends(get_current_user)
):
    if auth.role != Role.BANK_MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=404, detail="User not found")

    await db.query_messages.update_many(
        {
            "user_id": ObjectId(user_id),
            "manager_id": ObjectId(auth.user_id),
            "sender_role": "USER"
        },
        {"$set": {"is_read_by_manager": bool(payload.read)}}
    )
    return {"message": "Updated"}


"""
WebSocket Manager for managing connections and subscriptions
Handles real-time notifications for resource updates
"""
import json
import logging
from typing import Dict, Set, Optional
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections and resource subscriptions"""
    
    def __init__(self):
        # Map of user_id -> WebSocket connection
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Map of resource_type -> resource_id -> Set of user_ids subscribed
        # Format: {resource_type: {resource_id: {user_id1, user_id2, ...}}}
        self.subscriptions: Dict[str, Dict[int, Set[str]]] = defaultdict(lambda: defaultdict(set))
        
        # Map of user_id -> {resource_type: {resource_id: timestamp}}
        # Used for tracking what each user is subscribed to
        self.user_subscriptions: Dict[str, Dict[str, Set[int]]] = defaultdict(lambda: defaultdict(set))
    
    async def connect(self, websocket: WebSocket, user_id: str, user_email: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"WebSocket connected: user_id={user_id}, email={user_email}")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connected",
            "message": "WebSocket connection established",
            "user_id": user_id,
            "user_email": user_email
        }, user_id)
    
    def disconnect(self, user_id: str):
        """Remove a WebSocket connection and clean up subscriptions"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"WebSocket disconnected: user_id={user_id}")
        
        # Remove all subscriptions for this user
        if user_id in self.user_subscriptions:
            for resource_type, resource_ids in self.user_subscriptions[user_id].items():
                for resource_id in resource_ids:
                    if resource_type in self.subscriptions and resource_id in self.subscriptions[resource_type]:
                        self.subscriptions[resource_type][resource_id].discard(user_id)
                        # Clean up empty sets
                        if not self.subscriptions[resource_type][resource_id]:
                            del self.subscriptions[resource_type][resource_id]
            del self.user_subscriptions[user_id]
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to a specific user"""
        if user_id in self.active_connections:
            try:
                websocket = self.active_connections[user_id]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {str(e)}")
                # Remove broken connection
                self.disconnect(user_id)
    
    async def broadcast_to_subscribers(
        self,
        resource_type: str,
        resource_id: int,
        message: dict,
        exclude_user_id: Optional[str] = None
    ):
        """Broadcast a message to all users subscribed to a specific resource"""
        if resource_type not in self.subscriptions:
            return
        
        if resource_id not in self.subscriptions[resource_type]:
            return
        
        subscribers = self.subscriptions[resource_type][resource_id].copy()
        
        if exclude_user_id:
            subscribers.discard(exclude_user_id)
        
        for user_id in subscribers:
            await self.send_personal_message(message, user_id)
        
        logger.info(
            f"Broadcasted {message.get('type')} to {len(subscribers)} subscribers "
            f"for {resource_type}:{resource_id}"
        )
    
    async def subscribe(self, user_id: str, resource_type: str, resource_id: int):
        """Subscribe a user to a resource"""
        # Validate resource_type
        valid_types = {"client", "brand", "kpi_selection"}
        if resource_type not in valid_types:
            await self.send_personal_message({
                "type": "error",
                "message": f"Invalid resource_type: {resource_type}. Must be one of {valid_types}"
            }, user_id)
            return False
        
        # Add subscription
        self.subscriptions[resource_type][resource_id].add(user_id)
        self.user_subscriptions[user_id][resource_type].add(resource_id)
        
        logger.info(f"User {user_id} subscribed to {resource_type}:{resource_id}")
        
        await self.send_personal_message({
            "type": "subscribed",
            "resource_type": resource_type,
            "resource_id": resource_id,
            "message": f"Subscribed to {resource_type}:{resource_id}"
        }, user_id)
        
        return True
    
    async def unsubscribe(self, user_id: str, resource_type: str, resource_id: int):
        """Unsubscribe a user from a resource"""
        if resource_type in self.subscriptions and resource_id in self.subscriptions[resource_type]:
            self.subscriptions[resource_type][resource_id].discard(user_id)
            # Clean up empty sets
            if not self.subscriptions[resource_type][resource_id]:
                del self.subscriptions[resource_type][resource_id]
        
        if user_id in self.user_subscriptions and resource_type in self.user_subscriptions[user_id]:
            self.user_subscriptions[user_id][resource_type].discard(resource_id)
            if not self.user_subscriptions[user_id][resource_type]:
                del self.user_subscriptions[user_id][resource_type]
        
        logger.info(f"User {user_id} unsubscribed from {resource_type}:{resource_id}")
        
        await self.send_personal_message({
            "type": "unsubscribed",
            "resource_type": resource_type,
            "resource_id": resource_id,
            "message": f"Unsubscribed from {resource_type}:{resource_id}"
        }, user_id)
    
    async def notify_resource_updated(
        self,
        resource_type: str,
        resource_id: int,
        updated_by: str,
        updated_at: str,
        version: int,
        exclude_user_id: Optional[str] = None
    ):
        """Notify subscribers that a resource was updated"""
        message = {
            "type": "resource_updated",
            "resource_type": resource_type,
            "resource_id": resource_id,
            "updated_by": updated_by,
            "updated_at": updated_at,
            "version": version
        }
        
        await self.broadcast_to_subscribers(
            resource_type,
            resource_id,
            message,
            exclude_user_id
        )
    
    async def notify_sync_status(
        self,
        sync_type: str,
        brand_id: Optional[int],
        status: str,
        message: str,
        job_id: Optional[str] = None
    ):
        """Notify all users about sync job status"""
        notification = {
            "type": "sync_status",
            "sync_type": sync_type,
            "brand_id": brand_id,
            "status": status,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        if job_id:
            notification["job_id"] = job_id
        
        # Broadcast to all connected users
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(notification, user_id)
    
    def get_connection_count(self) -> int:
        """Get the number of active connections"""
        return len(self.active_connections)
    
    def get_subscription_count(self) -> int:
        """Get the total number of subscriptions"""
        total = 0
        for resource_type in self.subscriptions.values():
            for resource_ids in resource_type.values():
                total += len(resource_ids)
        return total


# Global instance
websocket_manager = WebSocketManager()


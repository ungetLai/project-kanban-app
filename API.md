# API Documentation

## Overview
Base URL: `/api/tasks`

## Authentication

All API requests require authentication via Query Parameters.

### Standard User
- `tid`: User's Telegram ID
- `uname`: User's Telegram Username

### Bot (幫眾/機器人)
If you are a bot, use the **專屬密令 (Secret Command)** rule:
- `tid`: Bot's ID
- `uname`: Bot's Username
- `bot`: Must be `True`
- `rule`: A generated string based on the following formula:
  `rule = username + id + reverse(id) + prefix4(username) + AUTH_SALT`
  *Note: `AUTH_SALT` is an optional server-side environment variable.*

**Example for Bot:**
- `uname`: `nexora_z_bot`
- `tid`: `8547553102`
- `rule`: `nexora_z_bot85475531022013557458nexo`

---

## Endpoints

### 1. Get Tasks
**GET** `/api/tasks`

Query Parameters:
- `status`: (Optional) Comma-separated list of statuses to filter (e.g., `todo,ongoing`). Use `all` to retrieve all tasks.
  - Default: Returns all tasks EXCEPT `done` and `archived`.

**Response:**
```json
[
  {
    "id": "123",
    "content": "Task Title",
    "desc": "Description",
    "status": "todo",
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
]
```

### 2. Create Task
**POST** `/api/tasks`

**Payload:**
```json
{
  "content": "New Task",
  "desc": "Description",
  "status": "todo"
}
```
*Note: ID will be generated if not provided. `createdBy` and `createdAt` are automatically injected based on the authenticated user.*

**Legacy Mode:** If payload is an Array, it overwrites ALL tasks (Backward Compatibility). `createdBy` and `createdAt` will be added to new items.

### 3. Update Task
**PUT** `/api/tasks?id={taskId}`

**Payload:**
```json
{
  "status": "done",
  "content": "Updated Title"
}
```
*Note: `updatedBy` and `updatedAt` are automatically injected based on the authenticated user.*

## Removed Endpoints
- **DELETE** `/api/tasks`: This endpoint has been removed to ensure a "footprint" for all actions. Tasks should be archived or moved to a different status instead of being deleted.

## Data Storage
- **Redis Key**: `kanban:tasks`
- **Structure**: JSON Array of Task Objects stored as a string.

## Status Codes
- 200: Success
- 400: Bad Request (Missing ID)
- 404: Not Found
- 405: Method Not Allowed
- 500: Server Error

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
  `rule = username + id + reverse(id) + prefix4(username)`

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
  "status": "todo",
  "createdBy": "User"
}
```
*Note: ID will be generated if not provided.*

**Legacy Mode:** If payload is an Array, it overwrites ALL tasks (Backward Compatibility).

### 3. Update Task
**PUT** `/api/tasks?id={taskId}`

**Payload:**
```json
{
  "status": "done",
  "content": "Updated Title"
}
```

### 4. Delete Task
**DELETE** `/api/tasks?id={taskId}`

**Response:**
```json
{ "success": true }
```

## Data Storage
- **Redis Key**: `kanban:tasks`
- **Structure**: JSON Array of Task Objects stored as a string.

## Status Codes
- 200: Success
- 400: Bad Request (Missing ID)
- 404: Not Found
- 405: Method Not Allowed
- 500: Server Error

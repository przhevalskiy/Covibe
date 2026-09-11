"""First-class workspace routes — alias of projects with workspace vocabulary."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from api.deps import require_any_scope, require_scope
from api.repositories import artifacts as artifacts_repo
from api.repositories import projects as projects_repo
from api.routes.projects import WriteProjectFileRequest
from api.services.project_files import project_root, resolve_project_file, walk_project_files

router = APIRouter(prefix="/v1/workspaces", tags=["Workspaces"])


class CreateWorkspaceRequest(BaseModel):
    name: str
    github_url: str | None = None
    linear_team_id: str | None = None
    jira_project_key: str | None = None
    instructions: str | None = None


class UpdateWorkspaceRequest(BaseModel):
    name: str | None = None
    github_url: str | None = None
    linear_team_id: str | None = None
    jira_project_key: str | None = None
    instructions: str | None = None


@router.get("")
async def list_workspaces(key: dict = Depends(require_any_scope("projects:read", "projects:write"))):
    workspaces = await projects_repo.list_projects(org_id=key["org_id"])
    return {"workspaces": workspaces}


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    key: dict = Depends(require_any_scope("projects:read", "projects:write")),
):
    workspace = await projects_repo.get_project(workspace_id, org_id=key["org_id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="workspace not found")
    return {"workspace": workspace}


@router.post("", status_code=201)
async def create_workspace(
    body: CreateWorkspaceRequest,
    key: dict = Depends(require_scope("projects:write")),
):
    try:
        workspace = await projects_repo.create_project(
            body.name,
            org_id=key["org_id"],
            user_id="api",
            github_url=body.github_url,
            linear_team_id=body.linear_team_id,
            jira_project_key=body.jira_project_key,
            instructions=body.instructions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return {"workspace": workspace}


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    body: UpdateWorkspaceRequest,
    key: dict = Depends(require_scope("projects:write")),
):
    workspace = await projects_repo.update_project(
        workspace_id,
        org_id=key["org_id"],
        name=body.name,
        github_url=body.github_url,
        linear_team_id=body.linear_team_id,
        jira_project_key=body.jira_project_key,
        instructions=body.instructions,
    )
    if not workspace:
        raise HTTPException(status_code=404, detail="workspace not found")
    return {"workspace": workspace}


@router.get("/{workspace_id}/artifacts")
async def list_workspace_artifacts(
    workspace_id: str,
    scope: str | None = None,
    key: dict = Depends(require_any_scope("projects:read", "projects:write")),
):
    workspace = await projects_repo.get_project(workspace_id, org_id=key["org_id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="workspace not found")
    rows = await artifacts_repo.list_artifacts(
        org_id=key["org_id"],
        project_id=workspace_id,
        scope=scope,
    )
    return {"artifacts": rows, "count": len(rows)}


@router.get("/{workspace_id}/files/tree")
async def workspace_files_tree(
    workspace_id: str,
    key: dict = Depends(require_any_scope("projects:read", "projects:write")),
):
    workspace = await projects_repo.get_project(workspace_id, org_id=key["org_id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="workspace not found")
    root = project_root(workspace)
    return JSONResponse({"files": walk_project_files(root), "source": "workspace"})


@router.get("/{workspace_id}/files/content")
async def workspace_files_content(
    workspace_id: str,
    path: str = Query(..., min_length=1),
    key: dict = Depends(require_any_scope("projects:read", "projects:write")),
):
    workspace = await projects_repo.get_project(workspace_id, org_id=key["org_id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="workspace not found")
    target = resolve_project_file(workspace, path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return JSONResponse({"path": path, "content": content, "source": "workspace"})


@router.put("/{workspace_id}/files/content")
async def workspace_files_write(
    workspace_id: str,
    body: WriteProjectFileRequest,
    key: dict = Depends(require_scope("projects:write")),
):
    workspace = await projects_repo.get_project(workspace_id, org_id=key["org_id"])
    if not workspace:
        raise HTTPException(status_code=404, detail="workspace not found")
    target = resolve_project_file(workspace, body.path)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        target.write_text(body.content, encoding="utf-8")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return JSONResponse({"path": body.path, "ok": True, "source": "workspace"})

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from api.deps import require_any_scope, require_scope
from api.repositories import artifacts as artifacts_repo

router = APIRouter(prefix="/v1/artifacts", tags=["Artifacts"])


@router.post("", status_code=201)
async def upload_artifact(
    file: UploadFile = File(...),
    project_id: str | None = Form(default=None),
    workspace_id: str | None = Form(default=None),
    scope: str = Form(default="run"),
    task_id: str | None = Form(default=None),
    key: dict = Depends(require_scope("projects:write")),
):
    resolved_id = project_id or workspace_id
    if not resolved_id:
        raise HTTPException(status_code=422, detail="project_id or workspace_id is required")
    if scope not in ("run", "workspace"):
        raise HTTPException(status_code=422, detail="scope must be run or workspace")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="empty file")

    try:
        artifact = await artifacts_repo.create_artifact(
            org_id=key["org_id"],
            project_id=resolved_id,
            filename=file.filename or "upload.txt",
            content=content,
            scope=scope,
            task_id=task_id,
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {"artifact": artifact}


@router.get("/{artifact_id}")
async def get_artifact(
    artifact_id: str,
    key: dict = Depends(require_any_scope("projects:read", "projects:write")),
):
    artifact = await artifacts_repo.get_artifact(artifact_id, org_id=key["org_id"])
    if not artifact:
        raise HTTPException(status_code=404, detail="artifact not found")
    return {"artifact": artifact}


@router.delete("/{artifact_id}", status_code=204)
async def delete_artifact(
    artifact_id: str,
    key: dict = Depends(require_scope("projects:write")),
):
    deleted = await artifacts_repo.delete_artifact(artifact_id, org_id=key["org_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="artifact not found")

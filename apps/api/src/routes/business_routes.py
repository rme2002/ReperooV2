from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from gotrue.types import User
from supabase._async.client import AsyncClient

from src.core.auth import get_current_user
from src.core.supabase import get_supabase
from src.models.model import (
    BusinessAssetType,
    BusinessAssetUploadResponse,
    BusinessCreatePayload,
    BusinessResponse,
    BusinessUpdatePayload,
)
from src.repositories.business_repository import BusinessRepository
from src.services.business_service import BusinessService
from src.services.errors import (
    BusinessConflictError,
    BusinessForbiddenError,
    BusinessNotFoundError,
)
from src.services.storage_service import StorageService

router = APIRouter()


def get_business_service(
    supabase: AsyncClient = Depends(get_supabase),
) -> BusinessService:
    repository = BusinessRepository(supabase)
    storage_service = StorageService(supabase)
    return BusinessService(repository, storage_service)


@router.get(
    "/me",
    response_model=BusinessResponse,
    responses={
        status.HTTP_403_FORBIDDEN: {"description": "Forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "Not Found"},
    },
)
async def get_my_business(
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service),
) -> BusinessResponse:
    try:
        business = await service.get_business_for_user(current_user)
        return BusinessResponse(business=business)
    except BusinessNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        status.HTTP_403_FORBIDDEN: {"description": "Forbidden"},
        status.HTTP_409_CONFLICT: {"description": "Conflict"},
    },
)
async def create_business(
    payload: BusinessCreatePayload,
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service),
) -> BusinessResponse:
    try:
        business = await service.create_business(current_user, payload)
        return BusinessResponse(business=business)
    except BusinessConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.patch(
    "/{business_id}",
    response_model=BusinessResponse,
    responses={
        status.HTTP_403_FORBIDDEN: {"description": "Forbidden"},
        status.HTTP_404_NOT_FOUND: {"description": "Not Found"},
    },
)
async def update_business(
    business_id: str,
    payload: BusinessUpdatePayload,
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service),
) -> BusinessResponse:
    try:
        business = await service.update_business(current_user, business_id, payload)
        return BusinessResponse(business=business)
    except BusinessForbiddenError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except BusinessNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/assets", response_model=BusinessAssetUploadResponse)
async def upload_business_asset(
    asset_type: BusinessAssetType = Form(..., alias="assetType"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service),
) -> BusinessAssetUploadResponse:
    url = await service.upload_asset(current_user, asset_type, file)
    return BusinessAssetUploadResponse(url=url)

from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class PaginationParams(BaseModel):
    """Schema for pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    size: int = Field(20, ge=1, le=100, description="Page size")
    offset: Optional[int] = Field(None, ge=0, description="Offset for pagination")

class PaginationResponse(BaseModel):
    """Schema for pagination response"""
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

class ErrorResponse(BaseModel):
    """Schema for error responses"""
    error: str
    message: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = None

class SuccessResponse(BaseModel):
    """Schema for success responses"""
    message: str
    status_code: int = 200
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Optional[Dict[str, Any]] = None

class StatusResponse(BaseModel):
    """Schema for status responses"""
    status: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class HealthCheckResponse(BaseModel):
    """Schema for health check response"""
    status: str
    version: str
    timestamp: datetime
    database: str
    websocket: str

class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"

class SortParams(BaseModel):
    """Schema for sorting parameters"""
    sort_by: Optional[str] = None
    sort_order: SortOrder = SortOrder.DESC

class FilterParams(BaseModel):
    """Schema for filter parameters"""
    status: Optional[str] = None
    type: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    user_id: Optional[int] = None

class SearchParams(BaseModel):
    """Schema for search parameters"""
    query: Optional[str] = None
    fields: Optional[List[str]] = None
    case_sensitive: bool = False

class BulkOperationRequest(BaseModel):
    """Schema for bulk operations"""
    ids: List[int]
    operation: str
    data: Optional[Dict[str, Any]] = None

class BulkOperationResponse(BaseModel):
    """Schema for bulk operation response"""
    operation: str
    total: int
    successful: int
    failed: int
    errors: List[Dict[str, Any]] = []

class ExportParams(BaseModel):
    """Schema for export parameters"""
    format: str = Field("json", pattern="^(json|csv|excel)$")
    include_metadata: bool = True
    date_range: Optional[str] = None

class ImportParams(BaseModel):
    """Schema for import parameters"""
    format: str = Field("json", pattern="^(json|csv|excel)$")
    validate_only: bool = False
    update_existing: bool = False 
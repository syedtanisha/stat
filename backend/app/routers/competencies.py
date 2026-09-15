from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.database import get_db
from ..core.security import get_current_user
from ..models.models import User, Competency, LearningResource
from ..schemas.competency import (
    CompetencyOut, CompetencyProfileOut, CompetencyGapAnalysisOut,
    LearningResourceOut, RecommendationResponse, LearningPathResponse,
    OfficialSourceOut, RefreshSourcesRequest, RefreshSourcesResponse,
    ResourceProgressOut, ResourceProgressUpdateReq, AdaptiveLearningPathStateOut
)
from ..services.catalog_service import (
    get_user_competency_profile, analyze_competency_gaps,
    get_personalized_recommendations, get_personalized_learning_path,
    igot_client, get_mospi_catalog, get_nssta_catalog
)

router = APIRouter(tags=["Competencies & Recommendations"])

@router.get("/competencies", response_model=List[CompetencyOut])
def get_all_competencies(db: Session = Depends(get_db)):
    return db.query(Competency).all()

@router.get("/competencies/profile", response_model=CompetencyProfileOut)
def get_my_competency_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_user_competency_profile(current_user.id, db)

@router.get("/competencies/gap-analysis", response_model=CompetencyGapAnalysisOut)
def get_my_gap_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return analyze_competency_gaps(current_user.id, db)

@router.get("/recommendations", response_model=RecommendationResponse)
@router.get("/recommendations/for-you", response_model=RecommendationResponse)
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_personalized_recommendations(current_user.id, db)


@router.get("/recommendations/learning-path", response_model=LearningPathResponse)
def get_learning_path(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_personalized_learning_path(current_user.id, db)

@router.get("/resources", response_model=List[LearningResourceOut])
def get_all_resources(
    source: Optional[str] = Query(None, description="Filter by source: 'iGOT_Karmayogi', 'NSSTA', 'MoSPI'"),
    competency_code: Optional[str] = Query(None, description="Filter by aligned competency code"),
    db: Session = Depends(get_db)
):
    query = db.query(LearningResource).filter(LearningResource.is_active == True)
    if source:
        s_clean = source.strip().lower()
        if s_clean in ["igot", "igot_karmayogi", "igot karmayogi"]:
            query = query.filter(LearningResource.source.ilike("%igot%"))
        else:
            query = query.filter(LearningResource.source.ilike(f"%{source}%"))
    resources = query.all()
    return [_build_learning_resource_out(r) for r in resources]

def _build_learning_resource_out(r: LearningResource) -> LearningResourceOut:
    aligned = [m.competency.code for m in r.competency_mappings if m.competency]
    first_mapping_prov = (
        r.competency_mappings[0].mapping_provenance
        if r.competency_mappings and hasattr(r.competency_mappings[0], 'mapping_provenance')
        else "Platform Curated Competency Mapping"
    )
    return LearningResourceOut(
        id=r.id,
        title=r.title,
        description=r.description,
        source=r.source,
        official_url=r.official_url,
        resource_type=r.resource_type,
        difficulty=r.difficulty,
        estimated_duration_mins=r.estimated_duration_mins,
        publisher_org=r.publisher_org or r.source,
        provenance_type=r.provenance_type,
        reference_period=r.reference_period,
        access_level=r.access_level or "PUBLIC",
        source_format=r.source_format,
        publication_date=r.publication_date,
        version=r.version,
        thumbnail_url=r.thumbnail_url,
        aligned_competencies=aligned,
        provider_external_id=getattr(r, "provider_external_id", None),
        verification_level=getattr(r, "verification_level", None) or "PORTAL_VERIFIED",
        mapping_provenance=first_mapping_prov
    )

@router.get("/resources", response_model=List[LearningResourceOut])
def get_all_resources(
    source: Optional[str] = Query(None, description="Filter by source: 'iGOT_Karmayogi', 'NSSTA', 'MoSPI'"),
    competency_code: Optional[str] = Query(None, description="Filter by aligned competency code"),
    db: Session = Depends(get_db)
):
    query = db.query(LearningResource).filter(LearningResource.is_active == True)
    if source:
        s_clean = source.strip().lower()
        if s_clean in ["igot", "igot_karmayogi", "igot karmayogi"]:
            query = query.filter(LearningResource.source.ilike("%igot%"))
        else:
            query = query.filter(LearningResource.source.ilike(f"%{source}%"))
    resources = query.all()

    out = []
    for r in resources:
        res_out = _build_learning_resource_out(r)
        if competency_code and competency_code not in res_out.aligned_competencies:
            continue
        out.append(res_out)
    return out

@router.get("/resources/{resource_id}", response_model=LearningResourceOut)
def get_resource_by_id(resource_id: int, db: Session = Depends(get_db)):
    res = db.query(LearningResource).filter(LearningResource.id == resource_id, LearningResource.is_active == True).first()
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning resource not found")
    return _build_learning_resource_out(res)

@router.get("/admin/resources/sources", response_model=List[OfficialSourceOut])
def get_admin_official_sources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    from ..services.official_integration_service import get_registered_sources
    return get_registered_sources(db)

@router.post("/admin/resources/refresh", response_model=RefreshSourcesResponse)
def trigger_admin_sources_refresh(
    req: Optional[RefreshSourcesRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    from ..services.official_integration_service import refresh_official_sources
    target_ids = req.source_ids if req else None
    result = refresh_official_sources(db, target_ids)
    return RefreshSourcesResponse(
        status="success",
        message=f"Official dataset and resource refresh completed. Processed {result['total_sources_processed']} sources, ingested {result['items_ingested']} items, updated {result['items_updated']} items.",
        total_sources_processed=result["total_sources_processed"],
        items_discovered=result["items_discovered"],
        items_ingested=result["items_ingested"],
        items_updated=result["items_updated"],
        duplicates_skipped=result["duplicates_skipped"],
        errors=result["errors"]
    )

@router.post("/learning/resources/{resource_id}/start", response_model=ResourceProgressOut)
def start_learning_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.learning_adaptive_service import start_resource_progress
    return start_resource_progress(db, current_user.id, resource_id)

@router.post("/learning/resources/{resource_id}/progress", response_model=ResourceProgressOut)
def update_learning_resource_progress(
    resource_id: int,
    req: ResourceProgressUpdateReq,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.learning_adaptive_service import update_resource_progress
    return update_resource_progress(db, current_user.id, resource_id, req.progress_percentage, req.time_spent_mins or 0)

@router.post("/learning/resources/{resource_id}/complete")
def complete_learning_resource(
    resource_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.learning_adaptive_service import complete_resource_progress
    try:
        res = complete_resource_progress(db, current_user.id, resource_id)
        return {
            "status": "COMPLETED",
            "message": f"Resource #{resource_id} successfully completed. Competency evidence processed.",
            "evidence_results": res["evidence_results"]
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/learning/my-path", response_model=AdaptiveLearningPathStateOut)
def get_my_adaptive_learning_path(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..models.models import UserResourceProgress, LearningProgressHistory
    from ..schemas.assessment import ProgressEventOut

    base_path = get_personalized_learning_path(current_user.id, db)
    gap_analysis = analyze_competency_gaps(current_user.id, db)

    # In-progress resources
    progress_records = db.query(UserResourceProgress).filter(
        UserResourceProgress.user_id == current_user.id
    ).all()

    in_prog_ids = {p.resource_id for p in progress_records if p.status == "IN_PROGRESS"}
    comp_ids = {p.resource_id for p in progress_records if p.status == "COMPLETED"}

    in_prog_resources = db.query(LearningResource).filter(LearningResource.id.in_(in_prog_ids)).all() if in_prog_ids else []
    comp_resources = db.query(LearningResource).filter(LearningResource.id.in_(comp_ids)).all() if comp_ids else []

    def to_out(r_list):
        return [_build_learning_resource_out(r) for r in r_list]

    recent_history_records = db.query(LearningProgressHistory).filter(
        LearningProgressHistory.user_id == current_user.id
    ).order_by(LearningProgressHistory.created_at.desc()).limit(10).all()

    recent_events = [
        ProgressEventOut(
            id=h.id,
            competency_id=h.competency_id,
            competency_name=h.competency.name if h.competency else "Core Discipline",
            domain=h.competency.domain if h.competency else "National Statistics",
            event_type=h.event_type,
            previous_score=h.previous_score,
            new_score=h.new_score,
            delta=h.delta,
            created_at=h.created_at
        )
        for h in recent_history_records
    ]

    return AdaptiveLearningPathStateOut(
        user_id=current_user.id,
        officer_name=current_user.full_name,
        designation=current_user.designation,
        division=current_user.department,
        overall_readiness_score=base_path.overall_readiness_score,
        primary_focus_gap=base_path.primary_focus_gap,
        resources_in_progress=to_out(in_prog_resources),
        resources_completed=to_out(comp_resources),
        remaining_gaps=gap_analysis.gaps,
        recent_learning_history=recent_events,
        learning_path_milestones=base_path.milestones
    )

@router.get("/learning/history")
def get_my_learning_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.learning_adaptive_service import get_user_learning_progress_history
    history = get_user_learning_progress_history(db, current_user.id)
    return [
        {
            "id": h.id,
            "competency_code": h.competency.code if h.competency else "STAT_CORE",
            "competency_name": h.competency.name if h.competency else "Core Discipline",
            "event_type": h.event_type,
            "previous_score": h.previous_score,
            "new_score": h.new_score,
            "delta": h.delta,
            "evidence_key": h.evidence_key,
            "created_at": h.created_at
        }
        for h in history
    ]

@router.get("/external/igot/courses")
async def get_igot_courses(competency_code: Optional[str] = None):
    return await igot_client.get_courses_by_competency(competency_code or "")

@router.get("/external/mospi/publications")
def get_mospi_publications():
    return get_mospi_catalog()

@router.get("/external/nssta/courses")
def get_nssta_courses():
    return get_nssta_catalog()

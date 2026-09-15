from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.database import get_db
from ..core.security import get_current_user
from ..models.models import User, Quiz, QuizAttempt, LearningResource, Competency, ResourceCompetencyMapping
from ..schemas.assessment import (
    BaselineAssessmentOut, BaselineAssessmentSubmit, BaselineAssessmentResultOut,
    QuizGenerateRequest, QuizOut, QuizQuestionDetailOut, QuizSubmitRequest, QuizAttemptResultOut,
    ProgressSummaryOut, FinalInterviewReadiness, FinalInterviewAnswerSubmit, FinalInterviewReportRequest, FinalInterviewReportResponse
)

from ..services.assessment_service import (
    get_baseline_assessment_data, evaluate_baseline_submission,
    create_ai_quiz, evaluate_quiz_submission, get_user_progress_summary,
    get_final_interview_readiness, generate_interview_questions
)
from ..services.ai_service import evaluate_interview_answer, generate_final_interview_report
from ..data.seed_data import COMPETENCIES_SEED, RESOURCES_SEED

router = APIRouter(tags=["Assessments, Quizzes & Progress"])

# Baseline Assessment Endpoints
@router.get("/assessments/baseline", response_model=BaselineAssessmentOut)
async def get_baseline_assessment(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await get_baseline_assessment_data(current_user, db)

@router.post("/assessments/baseline/submit", response_model=BaselineAssessmentResultOut)
def submit_baseline_assessment(
    submission: BaselineAssessmentSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return evaluate_baseline_submission(current_user.id, submission, db)

# Quiz Endpoints
@router.post("/quizzes/generate", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
@router.post("/assessments/generate", response_model=QuizOut, status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    request: QuizGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await create_ai_quiz(request, current_user.id, db)

@router.get("/quizzes", response_model=List[QuizOut])
@router.get("/assessments", response_model=List[QuizOut])
def get_my_quizzes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Quiz).filter(Quiz.user_id == current_user.id).order_by(Quiz.created_at.desc()).all()

@router.get("/quizzes/{quiz_id}", response_model=QuizOut)
@router.get("/assessments/{quiz_id}", response_model=QuizOut)
def get_quiz_by_id(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    if quiz.user_id and quiz.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not have permission to view this quiz.")

    return quiz

@router.post("/quizzes/{quiz_id}/start")
@router.post("/assessments/{quiz_id}/start")
def start_quiz_attempt(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    if quiz.user_id and quiz.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not have permission to start this quiz.")

    existing = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id).first()
    if existing:
        return {"attempt_id": existing.id, "status": existing.status or "IN_PROGRESS", "message": "Quiz attempt in progress."}

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.id,
        score=0.0,
        total_correct=0,
        total_questions=quiz.total_questions,
        status="IN_PROGRESS",
        feedback_method="Deterministic Pedagogical Feedback"
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return {"attempt_id": attempt.id, "status": attempt.status, "message": "Quiz attempt started successfully."}

@router.post("/quizzes/{quiz_id}/submit", response_model=QuizAttemptResultOut)
@router.post("/assessments/{quiz_id}/submit", response_model=QuizAttemptResultOut)
async def submit_quiz(
    quiz_id: int,
    submission: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    if quiz.user_id and quiz.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not have permission to submit answers for this quiz.")
    return await evaluate_quiz_submission(quiz_id, current_user.id, submission, db)

@router.get("/quizzes/{quiz_id}/results", response_model=QuizAttemptResultOut)
@router.get("/assessments/{quiz_id}/results", response_model=QuizAttemptResultOut)
async def get_quiz_results(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    if quiz.user_id and quiz.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not have permission to view results for this quiz.")

    attempt = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == current_user.id).order_by(QuizAttempt.completed_at.desc()).first()
    if not attempt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No completed attempt found for this quiz.")

    # Create dummy submission with correct answers to reconstruct evaluation payload
    questions = quiz.questions
    submission = QuizSubmitRequest(answers=[])
    return await evaluate_quiz_submission(quiz_id, current_user.id, submission, db)


# Progress Summary Endpoint
@router.get("/progress", response_model=ProgressSummaryOut)
@router.get("/progress/summary", response_model=ProgressSummaryOut)
def get_my_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_user_progress_summary(current_user.id, db)


# Final AI Interview Endpoints
@router.get("/final-interview/readiness", response_model=FinalInterviewReadiness)
@router.get("/assessments/final-interview/readiness", response_model=FinalInterviewReadiness)
def check_final_interview_readiness(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return get_final_interview_readiness(current_user.id, db)

@router.get("/final-interview/questions")
@router.post("/final-interview/questions")
@router.get("/assessments/final-interview/questions")
@router.post("/assessments/final-interview/questions")
async def get_final_interview_questions(
    num_questions: int = Query(5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await generate_interview_questions(current_user.id, db, num_questions)


@router.post("/final-interview/evaluate-answer")
@router.post("/assessments/final-interview/evaluate-answer")
async def evaluate_single_answer(
    payload: FinalInterviewAnswerSubmit,
    current_user: User = Depends(get_current_user)
):
    return await evaluate_interview_answer(
        payload.question, payload.answer, payload.competency, payload.domain, payload.difficulty
    )

@router.post("/final-interview/report", response_model=FinalInterviewReportResponse)
@router.post("/final-interview/generate-report", response_model=FinalInterviewReportResponse)
@router.post("/assessments/final-interview/report", response_model=FinalInterviewReportResponse)
@router.post("/assessments/final-interview/generate-report", response_model=FinalInterviewReportResponse)
async def generate_interview_report(
    payload: FinalInterviewReportRequest,
    current_user: User = Depends(get_current_user)
):
    records = [r.model_dump() if hasattr(r, 'model_dump') else r.dict() for r in payload.results]
    return await generate_final_interview_report(
        user_name=current_user.full_name,
        designation=current_user.designation,
        division=current_user.department,
        interview_records=records
    )

# Admin Endpoints
@router.get("/admin/stats")
def get_admin_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required.")
    
    total_users = db.query(User).count()
    total_comps = db.query(Competency).count()
    total_resources = db.query(LearningResource).count()
    total_attempts = db.query(QuizAttempt).count()

    all_users = db.query(User).all()

    # 1. Officers by Designation & Role Tier
    desig_counts: dict[str, int] = {}
    role_tier_counts: dict[str, int] = {"senior": 0, "mid": 0, "junior": 0, "technical": 0}
    tier_gaps: dict[str, list[float]] = {"senior": [], "mid": [], "junior": [], "technical": []}
    readiness_dist: dict[str, int] = {"Role Ready (>=85%)": 0, "Substantially Capable (70-84%)": 0, "Developing (50-69%)": 0, "Needs Training (<50%)": 0}

    from ..services.catalog_service import resolve_role_benchmarks, get_user_competency_profile
    for u in all_users:
        desig = u.designation or "Statistical Officer"
        desig_counts[desig] = desig_counts.get(desig, 0) + 1

        role_meta = resolve_role_benchmarks(u.department, u.designation)
        tier = role_meta.get("role_category", "mid")
        role_tier_counts[tier] = role_tier_counts.get(tier, 0) + 1

        prof = get_user_competency_profile(u.id, db)
        score = prof.overall_readiness_score
        if score >= 85.0:
            readiness_dist["Role Ready (>=85%)"] += 1
        elif score >= 70.0:
            readiness_dist["Substantially Capable (70-84%)"] += 1
        elif score >= 50.0:
            readiness_dist["Developing (50-69%)"] += 1
        else:
            readiness_dist["Needs Training (<50%)"] += 1

        for c in prof.competencies:
            if c.gap > 0:
                tier_gaps[tier].append(c.gap)

    avg_gaps_by_tier = {
        tier: round(sum(gaps) / len(gaps), 1) if gaps else 0.0
        for tier, gaps in tier_gaps.items()
    }

    # 2. Learning Improvement by Designation
    attempts = db.query(QuizAttempt).all()
    user_map = {u.id: u for u in all_users}
    improvement_by_desig: dict[str, float] = {}
    for att in attempts:
        u = user_map.get(att.user_id)
        if u and att.competency_delta:
            d_name = u.designation or "Statistical Officer"
            improvement_by_desig[d_name] = round(improvement_by_desig.get(d_name, 0.0) + att.competency_delta, 1)

    return {
        "total_officers_registered": total_users,
        "total_statistical_competencies": total_comps,
        "total_learning_resources": total_resources,
        "total_quizzes_completed": total_attempts,
        "officers_by_designation": desig_counts,
        "officers_by_role_tier": role_tier_counts,
        "average_competency_gaps_by_role": avg_gaps_by_tier,
        "role_readiness_distribution": readiness_dist,
        "learning_improvement_by_designation": improvement_by_desig,
        "status": "Operational"
    }

@router.post("/admin/seed", status_code=status.HTTP_200_OK)
def trigger_database_seed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required.")
    
    if db.query(Competency).count() == 0:
        for c in COMPETENCIES_SEED:
            db.add(Competency(**c))
        db.commit()

    if db.query(LearningResource).count() == 0:
        comps = {c.code: c for c in db.query(Competency).all()}
        for r in RESOURCES_SEED:
            res = LearningResource(
                title=r["title"], description=r["description"], source=r["source"],
                official_url=r["official_url"], resource_type=r["resource_type"],
                difficulty=r["difficulty"], estimated_duration_mins=r["estimated_duration_mins"]
            )
            db.add(res)
            db.flush()
            comp_code = r.get("competency_code")
            if comp_code and comp_code in comps:
                db.add(ResourceCompetencyMapping(resource_id=res.id, competency_id=comps[comp_code].id, relevance_score=1.0))
        db.commit()

    return {"message": "Database successfully seeded with official competencies and resources."}


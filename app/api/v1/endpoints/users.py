from fastapi import APIRouter

router = APIRouter()


@router.get("/profile")
async def get_profile():
    return {"message": "Get user profile - to be implemented"}


@router.put("/profile")
async def update_profile():
    return {"message": "Update user profile - to be implemented"}


@router.post("/kyc")
async def submit_kyc():
    return {"message": "Submit KYC documents - to be implemented"}
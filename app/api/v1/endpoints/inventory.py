from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def get_inventory():
    return {"message": "Get inventory items - to be implemented"}


@router.post("/")
async def add_inventory():
    return {"message": "Add inventory item - to be implemented"}


@router.put("/{item_id}")
async def update_inventory():
    return {"message": "Update inventory item - to be implemented"}


@router.get("/alerts")
async def get_alerts():
    return {"message": "Get inventory alerts - to be implemented"}
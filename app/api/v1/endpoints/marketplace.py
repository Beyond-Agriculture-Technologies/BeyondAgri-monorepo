from fastapi import APIRouter

router = APIRouter()


@router.get("/products")
async def get_products():
    return {"message": "Get products - to be implemented"}


@router.post("/products")
async def create_product():
    return {"message": "Create product listing - to be implemented"}


@router.get("/orders")
async def get_orders():
    return {"message": "Get orders - to be implemented"}


@router.post("/orders")
async def create_order():
    return {"message": "Create order - to be implemented"}
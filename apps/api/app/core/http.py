from fastapi import HTTPException


def find_or_404(items: list, item_id: str):
    for item in items:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=404, detail="Resource not found")

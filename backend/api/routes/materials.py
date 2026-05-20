from fastapi import APIRouter, HTTPException
from schemas import MATERIALS_DB, SECTIONS_DB, Material, Section

router = APIRouter()


@router.get("/materials", response_model=list[Material])
def list_materials():
    return list(MATERIALS_DB.values())


@router.get("/materials/{material_id}", response_model=Material)
def get_material(material_id: str):
    from fastapi import HTTPException
    if material_id not in MATERIALS_DB:
        raise HTTPException(404, f"Materiale '{material_id}' non trovato")
    return MATERIALS_DB[material_id]


@router.get("/sections", response_model=list[Section])
def list_sections():
    return list(SECTIONS_DB.values())


@router.get("/sections/{section_id}", response_model=Section)
def get_section(section_id: str):
    if section_id not in SECTIONS_DB:
        raise HTTPException(404, f"Sezione '{section_id}' non trovata")
    return SECTIONS_DB[section_id]


@router.post("/sections", response_model=Section)
def add_section(section: Section):
    """Aggiunge o sovrascrive una sezione personalizzata in libreria."""
    SECTIONS_DB[section.id] = section
    return section


@router.delete("/sections/{section_id}")
def delete_section(section_id: str):
    if section_id not in SECTIONS_DB:
        raise HTTPException(404, f"Sezione '{section_id}' non trovata")
    del SECTIONS_DB[section_id]
    return {"deleted": section_id}


@router.post("/materials", response_model=Material)
def add_material(material: Material):
    """Aggiunge o sovrascrive un materiale personalizzato in libreria."""
    MATERIALS_DB[material.id] = material
    return material

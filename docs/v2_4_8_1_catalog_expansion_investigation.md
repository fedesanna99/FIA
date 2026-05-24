# v2.4.8.1 · Catalog expansion · Investigation

**Sprint**: `v2.4.8.1-catalog-expansion-ipe-hea-heb-hem` (Sprint 2 di compound `v2.4.x-followup-fixes`)
**Data**: 2026-05-24

## Stato attuale

File: `backend/schemas/material.py`

| Serie | Profili attuali | EN 10365 standard | Mancanti |
|---|---|---|---|
| IPE | 8 (100, 200, 240, 270, 300, 360, 400, 500) | 18 | 10 |
| HEA | 4 (100, 200, 240, 300) | 24 | 20 |
| HEB | 4 (100, 200, 240, 300) | 24 | 20 |
| HEM | 0 | 24 | 24 |
| **TOTALE** | **16** | **90** | **74** |

## Schema dato

Tupla 15-element in unità SI: `(h, b, tw, tf, r, A, Iy, Iz, J, Wely, Welz, Wply, Wplz, Iw)`

Registrazione in dict `_IPE_DATA`/`_HEA_DATA`/`_HEB_DATA`; loop `_build_steel_profiles()` registra in `SECTIONS_DB`.

## Source dei dati

EN 10365:2017 / Arcelor Mittal European Sections handbook. Valori pubblici, ben documentati e riproducibili. Strategia conservativa: prima di aggiungere ogni profilo, controllo che A/Iy/Wely siano consistenti con le formule analitiche di base (sezione rettangolare equivalente).

## Plan

1. Estendere `_IPE_DATA` (+10 profili)
2. Estendere `_HEA_DATA` (+20 profili)
3. Estendere `_HEB_DATA` (+20 profili)
4. Creare `_HEM_DATA` (+24 profili)
5. Aggiornare `_build_steel_profiles()` per includere HEM
6. Estendere `_ec3_section_class_expected.py` con i nuovi profili
7. Run test parametrico (~110-120 test totali attesi)

Stima ~half day. STOP se > 15 profili EN Annex F non univocamente reperibili o > 10 classificati male.

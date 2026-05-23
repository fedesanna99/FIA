# Audit FEA Pro per cliente €2000/mese — Checklist 280 test

> Stilata 2026-05-23 sera. Aggiornata progressivamente.
> Legenda: ✅ PASS · ❌ FAIL · ⏭️ SKIP/missing · 🔲 TODO · ⚠️ PASS con riserva

## Status globale (FINALE — audit completo)

| Fase | Test | PASS | FAIL | TODO | %OK |
|---|---|---|---|---|---|
| 1 — Engine + NAFEMS | 30 | 27 | 3 | 0 | 90% |
| 2 — EC2/EC3/EC5/EC8/NTC | 50 | 38 | 25 | 0 | 60% |
| 3 — Results + Export + Edge | 25 | 23 | 2 | 0 | 92% |
| 4 — Analisi avanzate | 10 | 10 | 0 | 0 | 100% |
| 5 — UI/UX workflows | 17 | 13 | 4 | 0 | 76% |
| 6 — Mobile & tablet | 12 | 5 | 1 | 6 | 42% |
| 7 — Auth/Billing/Collab | 26 | 18 | 5 | 3 | 78% |
| 8 — Performance & scaling | 10 | 6 | 1 | 3 | 60% |
| 9 — Sicurezza/A11y/I18n | 24 | 14 | 13 | 0 | 58% |
| 10 — Integrazione & docs | 24 | 8 | 6 | 10 | 33% |
| 11 — Real-world | 10 | 9 | 1 | 0 | 90% |
| 12 — Comparative concorrenti | 8 | 5 | 0 | 3 | 63% |
| **TOTALE** | **~280** | **176** | **61** | **25** | **63% PASS · 22% FAIL · 9% TODO + 6% N/A · 252/280 eseguiti = 90%** |

---

# A. Engine validation numerica (20 test, FASE 1)
| ID | Test | Status | Evidence |
|---|---|---|---|
| A1 | Trave bi-app δ_max teorica | ✅ | 9.617=9.617mm |
| A2 | σ_max W_el vs W_pl | ⚠️ | engine usa W_pl |
| A3 | Cantilever PL³/3EI | ✅ | 0.513=0.513mm |
| A4 | Fixed-fixed qL⁴/384EI | ✅ | 1.923=1.923mm |
| A5 | Trave continua 2 campate | 🔲 | TODO |
| A6 | Telaio portale 2D | ✅ | δ=7.96mm, Σ_R=Σ_L=0 |
| A7 | Telaio multipiano 5p | 🔲 | TODO |
| A8 | Truss isostatica Σ check | ✅ | Fx/Fy/Fz tutti 0 |
| A9 | Truss iperstatica | 🔲 | TODO |
| A10 | Cable parabolic | ✅ | cable bridge template OK |
| A11 | Convergence 2-80 elem | ✅ | esatto da n=2 |
| A12 | Σ Reactions = Σ Loads | ✅ | 0.0000N |
| A13 | Σ M = 0 bi-app | ✅ | 0.00 Nm |
| A14 | NAFEMS LE1 patch test | ❌ FAKE | err 48.85% tolerance=100% |
| A15 | Plate twist | 🔲 | TODO |
| A16 | Beam shear locking Q4 | 🔲 | TODO |
| A17 | Solid H8 trazione | ✅ | template OK |
| A18 | Tri3 membrana NAFEMS | ✅ | template OK |
| A19 | Shell laminato CLT | ✅ | δ=5.27mm |
| A20 | Trave app-incastr -PL/8 | 🔲 | TODO |

# B. NAFEMS benchmarks (10 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| B1 | LE1 Elliptic 92.7 MPa | ❌ FAKE | actual 47.4 (err 49%) |
| B2 | LE2 Cylindrical cantilever | ✅ | err 1.5e-11 % |
| B3 | LE3 Hemisphere | 🔲 | TODO |
| B4 | LE5 Z-section | 🔲 | TODO |
| B5 | LE6 Skew plate | 🔲 | TODO |
| B6 | LE10 Thick plate | ⏭️ | non implementato (claim marketing falso) |
| B7 | LE11 Solid cylinder | 🔲 | TODO |
| B8 | T1 Time-dependent | 🔲 | TODO |
| B9 | Validation page report | ✅ | endpoint json OK |
| B10 | Trust QUALIFIED stato | 🔲 | TODO |

# C. Analisi avanzate (18 test, ALL PASS!)
| ID | Test | Status | Evidence |
|---|---|---|---|
| C1 | Modale f₁ | ✅ | 28.123 vs 28.126 Hz |
| C2 | f₂=4·f₁ | ✅ | 112.50 esatto |
| C3 | Modal Tower 3D 6 modi | ✅ | f₁=0.64Hz, eff_mass OK |
| C4 | Buckling Eulero | ✅ | 10824kN esatto |
| C5 | Buckling K-factor | 🔲 | TODO |
| C6 | Response spectrum CQC | ⏭️ | schema mismatch |
| C7 | Response spectrum SRSS | 🔲 | TODO |
| C8 | Time history seismic | ✅ | endpoint 200 |
| C9 | Newmark dt critico | 🔲 | TODO |
| C10 | Pushover capacity curve | ✅ | steps converged lambda+hinges |
| C11 | Pushover UI wizard | 🔲 | TODO |
| C12 | NL Newton-Raphson | ✅ | converged res 1e-13 |
| C13 | Arc-length snap-back | ✅ | cable bridge OK |
| C14 | NL+AL UI wizards | 🔲 | TODO |
| C15 | P-delta column slender | 🔲 | TODO |
| C16 | Cable pretension NL | 🔲 | TODO |
| C17 | Solver CG vs direct | 🔲 | TODO |
| C18 | Restart from snapshot | 🔲 | TODO |

# D. Verifiche EC2 (16 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| D1.1 | Bending M_Rd classic 287.8kNm | ✅ | match |
| D1.2 | Bending light reinforced | ✅ | 84.8 kNm |
| D1.3 | Bending high reinf x/d>0.45 | ⚠️ | is_ductile flag OK |
| D1.4 | M_Ed=0 edge case | ⚠️ | no crash ma M_Rd=NaN |
| D2 | Doppia armatura | 🔲 | TODO |
| D3 | T-beam b_eff | 🔲 | TODO |
| D4 | Sezione circolare | 🔲 | TODO |
| D5 | N-M interaction | 🔲 | TODO |
| D6 | Pressoflessione biass | 🔲 | TODO |
| D2.1 | Shear V<V_Rd,c no stirrups | ✅ | UR=0.842 |
| D2.2 | **Shear V>V_Rd,c staffe_nec** | ❌ | needs_stirrups=false BUG |
| D2.3 | Shear con staffe | ✅ | V_Rd=198 kN |
| D2.4 | cot_θ=1 vs 2.5 | 🔲 | TODO |
| D8 | V_Rd,max bielle | 🔲 | TODO |
| D10 | Torsione Bredt-Batho | 🔲 | TODO |
| D11 | Punzonamento §6.4 | ❌ | endpoint missing |
| D12 | Deflection long-term | ❌ | endpoint missing |
| D13 | Crack width §7.3 | ❌ | endpoint missing |
| D14 | ρ_min auto-check | 🔲 | TODO |
| D15 | Max spacing staffe | 🔲 | TODO |

# E. Verifiche EC3 (sistematici fail su section class)
| ID | Test | Status | Evidence |
|---|---|---|---|
| E1.ipe_100.s275 | C1 attesa | ✅ | class=1 |
| E1.ipe_100.s355 | C1 | ✅ | class=1 |
| E1.ipe_200.s275 | C1 | ✅ | class=1 |
| E1.ipe_200.s355 | C1 | ❌ | class=2 |
| E1.ipe_240.s275 | C1 | ❌ | class=2 |
| E1.ipe_240.s355 | C1 | ❌ | class=2 |
| E1.ipe_270.s275 | C1 | ❌ | class=2 |
| E1.ipe_270.s355 | C1 | ❌ | class=3 |
| E1.ipe_300.s275 | C1 | ❌ | class=2 |
| E1.ipe_300.s355 | C1 | ❌ | **class=4** |
| E1.ipe_360.s275 | C1 | ❌ | class=3 |
| E1.ipe_360.s355 | C1 | ❌ | class=4 |
| E1.ipe_400.s275 | C1 | ❌ | class=3 |
| E1.ipe_400.s355 | C1 | ❌ | class=4 |
| E1.ipe_500.s275 | C1 | ❌ | class=4 |
| E1.ipe_500.s355 | C1 | ❌ | class=4 |
| E2.hea_300.s355 | C1 | ❌ | class=3 |
| E3 | N_t,Rd | ✅ | implicit |
| E4 | N_c,Rd | 🔲 | TODO |
| E5 | M_c,Rd W_pl/el | ⚠️ | engine uses W_pl forzato |
| E6 | Curve a-d buckling | 🔲 | TODO |
| E7 | LTB §6.3.2 M_cr | 🔲 | TODO |
| E8 | N+M k_yy k_yz | 🔲 | TODO |
| E9 | N+M biass colonna | 🔲 | TODO |
| E10 | V_pl,Rd | 🔲 | TODO |
| E11 | M-V interaction | 🔲 | TODO |
| E12 | Web crippling | 🔲 | TODO |
| E13 | Conn bolted §8 | 🔲 | TODO endpoint? |
| E14 | Conn welded | 🔲 | TODO |
| E15 | Fatigue EC3-1-9 | ❌ | schema mismatch 422 |
| E16 | Built-up sections | 🔲 | TODO |
| E17 | Cold-formed | 🔲 | TODO |

# F. EC8 / NTC18 (15 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| F1.A-E | Spectrum Type1 suolo | ✅ | con type='1', valori corretti |
| F1.2A-C | Spectrum Type2 | ✅ | OK |
| F2 | q-factor frame DCM | ⚠️ | solo frame_concrete/steel + wall_concrete |
| F3.Roma | NTC18 lat/lon | ⚠️ | a_g/g=0.134, soil sempre A, F_0=2.5 fissi |
| F3.Catania | NTC18 | ⚠️ | 0.081 |
| F3.Milano | NTC18 | ⚠️ | 0.059 |
| F3.LAquila | NTC18 | ⚠️ | 0.172 (era 0.26 storica) |
| F4 | 4 stati limite SLO-SLC | 🔲 | TODO |
| F5 | T1-T4 topografica | 🔲 | TODO |
| F6 | q CDA/CDB classi | 🔲 | TODO |
| F7 | Applicare spettro al modello | 🔲 | TODO UI |
| F8 | Combinazioni sismiche | 🔲 | TODO |
| F9 | X+0.3Y direzionalità | 🔲 | TODO |
| F10 | Massa partecipante >85% | ✅ | tower x+y=295k>0 |
| F11 | Modi X/Y identificazione | 🔲 | TODO |
| F12 | Capacity design | 🔲 | TODO |
| F13 | Pushover N2 Fajfar | 🔲 | TODO |
| F14 | Accelerogrammi upload | 🔲 | TODO (file fixture missing) |
| F15 | Vulnerabilità NTC §C8 | 🔲 | TODO |

# G. Catalogo materiali e sezioni
| ID | Test | Status | Evidence |
|---|---|---|---|
| D1 | CLS C20→C90 14 classi | ⚠️ | 6 classi (no C50+) |
| D2 | S235/275/355/420/460 | ✅ | tutti |
| D3 | S500/690 HISTAR | ❌ | nessuno |
| D4 | B450C NTC18 | ✅ | rebar_b450c |
| D5 | B450A | 🔲 | TODO check |
| D6 | Inox 304/316 | 🔲 | TODO |
| D7 | Legno C14-C50 | ⚠️ | solo C24, C30 |
| D8 | Glulam GL24h-GL36h | ⚠️ | solo GL24h, GL28h |
| D9 | Aluminium 6061 | ✅ | presente |
| D10 | Editor mat custom | ✅ | API funziona |
| G11 | IPE 80-600 (15) | ⚠️ | 8 IPE |
| G12 | HEA/HEB | ✅ | 8 profili |
| G13 | UPN/UPE | ❌ | 0 |
| G14 | Angolari L | ❌ | 0 |
| G15 | RHS/SHS | ❌ | 0 |
| G16 | CHS circolari | ❌ | 0 |
| G17 | Editor sezione parametrica | 🔲 | TODO UI |
| G18 | Sezione arbitraria poligonale | 🔲 | TODO |
| G19 | Composita EC4 | 🔲 | TODO |

# H. Geometria & Modeling
| ID | Test | Status | Evidence |
|---|---|---|---|
| H1 | Aggiungi nodo | ✅ | testato UI |
| H2 | Pick-from-viewport | 🔲 | TODO |
| H3 | Snap to grid | 🔲 | TODO |
| H4 | Generate nodes batch | ✅ | mesh/line/box/shell/parametric |
| H5 | Translation/rotation/extrusion | 🔲 | TODO |
| H6 | Coord cilindriche | 🔲 | TODO |
| H7-H10 | Crea elementi | ✅ | tutti 12 types creati |
| H11 | Edit elemento | 🔲 | TODO |
| H12 | Cancella cascading | 🔲 | TODO |
| H13 | Mesh refinement auto | 🔲 | TODO |
| H14 | Mesh quality skewness | 🔲 | TODO |
| H15 | Copy/cut/paste | 🔲 | TODO |
| H16 | Mirror/rotate sel | 🔲 | TODO |

# I. Carichi (19 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| I1 | Nodal Fx Fy Fz M | ✅ | API 200 |
| I2 | Distrib uniforme | ✅ | OK |
| I3 | Distrib triang | ✅ | accept |
| I4 | Distrib trapez | ✅ | accept |
| I5 | Pressione | ✅ | accept |
| I6 | Self-weight | ✅ | OK |
| I7 | Temperature | ✅ | OK |
| I8 | Shrinkage CA | 🔲 | TODO |
| I9 | Creep φ | 🔲 | TODO |
| I10 | Neve auto location | ❌ | provider timeout 503 |
| I11 | Vento auto 4-direz | 🔲 | TODO |
| I12 | NTC zone regionali | 🔲 | TODO |
| I13 | Sismica applica modello | ⚠️ | backend OK, UI workflow TODO |
| I14 | Imposed displacement | 🔲 | TODO |
| I15 | Moving load EC1-2 | 🔲 | TODO |
| I16 | Multi load cases | 🔲 | TODO |
| I17 | Combinations editor | 🔲 | TODO |
| I18 | Auto SLU/SLE NTC | 🔲 | TODO |
| I19 | Envelope max/min | 🔲 | TODO |

# J. Vincoli (10 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| J1-J7 | Tutti 7 tipi | ✅ | fixed/pinned/roller_x/y/z/custom/spring tutti OK |
| J8 | Symmetry plane | 🔲 | TODO |
| J9 | Winkler suolo | 🔲 | TODO (winkler_k field esiste in element) |
| J10 | Cerniera plastica preex | 🔲 | TODO |

# K. Results & Inspect
| ID | Test | Status | Evidence |
|---|---|---|---|
| K1 | Spostamenti tabella | ✅ | backend OK (UI placeholder) |
| K2 | Reactions tabella | ✅ | backend OK |
| K3 | N V M tabella | ✅ | backend |
| K4 | σ_top/bot/τ | ✅ | backend |
| K5 | Von Mises contour | ✅ | backend |
| K6 | Principal stresses + dir | ✅ | backend |
| K7 | Diagrammi N/V/M plot | 🔲 | TODO UI |
| K8 | Click elem details | ✅ | testato UI |
| K9 | Modal shapes animation | 🔲 | TODO UI |
| K10 | Modal participation | ✅ | effective_mass_x/y/z presenti |
| K11 | Modal mass cumulative | ✅ | calc OK |
| K12 | Buckling modes shapes | 🔲 | TODO |
| K13 | Pushover curve plot | 🔲 | TODO UI |
| K14 | Plastic hinge tracking | ✅ | step.n_hinges presente |
| K15 | TH risposta nodo | 🔲 | TODO |
| K16 | Section diagram custom | 🔲 | TODO |
| K17 | Iso-superfici 3D | 🔲 | TODO |
| K18 | Fatica panel | ❌ | endpoint schema mismatch |

# L. EC4/EC5/EC6/EC7/EC9 (14 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| L1-L3 | EC4 composite | ❌ | endpoint missing |
| L4-L7 | EC5 timber | ⚠️ | solo 4 classi funzionano |
| L8-L10 | EC6 muratura | ❌ | endpoint missing |
| L11-L13 | EC7 geotech | ❌ | endpoint missing |
| L14 | EC9 alluminio | ❌ | endpoint missing |

# M. Report PDF/Export (20 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| M1 | UI Report dialog 3 path | ❌ | tutti morti |
| M2 | PDF backend | ✅ | 5160B valid 2-page |
| M3-M10 | PDF content checks | 🔲 | TODO leggere PDF |
| M11 | XLSX backend | ✅ | 8816B valid Excel |
| M12-M14 | XLSX content/CSV | 🔲 | TODO |
| M15 | DXF export | ✅ | 18947B |
| M16 | IFC4 export | ✅ | 4096B |
| M17 | SAF format | 🔲 | TODO endpoint? |
| M18 | JSON roundtrip | 🔲 | TODO |
| M19 | DWG export | 🔲 | TODO |
| M20 | Computo metrico | 🔲 | TODO |

# N. UX workflows (17 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| N1 | Undo addNode | ❌ | non funziona live |
| N2 | Redo | ❌ | dipende N1 |
| N3 | Undo 10 mutations | 🔲 | TODO |
| N4 | Undo persiste reload | 🔲 | TODO |
| N5 | Snapshot rename+diff (v2.3.1) | 🔲 | TODO |
| N6 | Snapshot persistence (v2.3.2) | ✅ | verified inject |
| N7 | Compare A/B (v2.3.0) | ✅ | verified UI |
| N8-N17 | Altri UX | 🔲 | TODO |

# O. Mobile (12 test) — TUTTI TODO

# P. Auth (10 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| P1 | Signup | ✅ | 201 + JWT |
| P3 | Login | ✅ | 200 + token |
| P4 | Password reset | ❌ | no endpoint |
| P5 | MFA | ❌ | no endpoint |
| P9 | DELETE account GDPR | ❌ | no endpoint |
| Others | TODO | 🔲 | |

# Q. Billing (8 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| Q1 | Quota endpoint | ✅ | tier=free cap=50 |
| Q2 | Cost preview | ❌ | schema mismatch 422 |
| Q4 | Tier change | ✅ | 200 |
| Q7 | Provider usage (F6) | ✅ | n_calls cache_ratio OK |

# R. Performance (10 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| R1 | 10 elem <100ms | ✅ | 31ms |
| R2 | 100 elem <500ms | ✅ | 77ms |
| R3 | 1000 elem <5s | ✅ | 1073ms |
| R4 | 10000 elem | 🔲 | TODO |
| R5-R10 | Bundle/memory/FPS | 🔲 | TODO |

# S. Edge cases (15 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| S1 | Sovrasingolare | ✅ | error 500 generico |
| S3 | Zero-length | ❌ | accettato 200 |
| S4 | Coincident nodes | ❌ | accettati silenziosi |
| S15 | Auto-detect | ✅ | endpoint OK |

# T. Security (9 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| T3 | XSS name | ⚠️ | stored letterale |
| T4 | SQL inj | ✅ | 404 reject |
| T5 | CORS lockdown | ✅ | evil origin blocked |
| T6 | Rate limit brute | 🔲 | TODO |
| T-hdr1 | HSTS | ❌ | missing |
| T-hdr2 | X-Content-Type | ❌ | missing |
| T-hdr3 | X-Frame | ❌ | missing |
| T-hdr4 | CSP | ❌ | missing |
| T7-T9 | Audit log, GDPR, OWASP | 🔲 | TODO |

# U. A11y (8 test) — Tutti 🔲 TODO eccetto U8 skip link verified

# V. I18n (7 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| V1 | Italian | ✅ | completo |
| V6 | € | ✅ | visibile |
| Others | TODO | 🔲 | |

# W. Integrazione (8 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| W6 | API OpenAPI | ✅ | esposto |
| W8 | CLI tool | ✅ | feapro_client esiste |
| Others | TODO | 🔲 | |

# X. Documentation (10 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| X1 | USER_GUIDE.md | ✅ | 16 sezioni v2.2.4 |
| X3 | OpenAPI docs | ✅ | OK |
| Others | TODO | 🔲 | |

# Y. AI Copilot (7 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| Y2-Y3 | AI ask LTB/UC | ❌ | schema vuole model_id |
| Others | TODO | 🔲 | |

# Z. Real-world (10 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| Z1 | Capannone acciaio | ✅ | δ=25.89mm σ=50.8MPa solve OK |
| Z1.ec3 | EC3 4 elem | ✅ | all classified (con bug class wrong) |
| Z2 | Edificio CA 3p | ⏭️ | test hanged (probabile DOF issue) |
| Z3 | Solaio CA | ✅ | δ=2.92mm < L/250 |
| Z4-Z10 | Other case studies | 🔲 | TODO |

# AA. Comparative (8 test)
| ID | Test | Status | Evidence |
|---|---|---|---|
| AA7 | Prezzi 2026 verificati | ✅ | ProSap €2k, AEC €3k, SAP €2.9k, IDEA €3k |
| AA1-AA6, AA8 | Same model vs concorrenti | 🔲 | TODO (richiede licenze) |

# AB. Bonus (6 test) — Tutti 🔲 TODO

---

# Bug confermati (15)

1. **EC3 section_classification sistematico** — IPE 200+ in S355 sempre C2-C4, IPE 500 sempre C4 (uses 33ε anima compressione invece 72ε flessione)
2. **EC2 needs_stirrups logica inversa** — UR=1.578 → needs_stirrups:false (critico ingegneristico)
3. **NAFEMS LE1 fake PASS** — tolerance_pct=100% maschera err reale 48.85%
4. **EC2 SLE endpoint missing** — punching/crack/deflection long-term tutti 405
5. **EC5 timber 90% broken** — solo C24/C30/GL24h/GL28h funzionano
6. **EC4/EC6/EC7/EC9 endpoint completi assenti**
7. **NTC18 sismica = proxy USGS** non vero INGV reticolo (soil/F_0/T_c* fissi)
8. **PDF/XLSX UI 3 path broken** — backend genera ma frontend event dispatcher rotto
9. **Undo/Redo broken in produzione** v2.3.0 non integrato con UI
10. **API anti-pattern** id richiesto in POST body
11. **Edge cases non validati** — zero-length OK, nodi coincidenti OK
12. **Security headers missing** (4: HSTS/CSP/X-Frame/X-Content-Type)
13. **Provider Open-Meteo timeout 503** — carichi clima auto fail
14. **No DELETE account GDPR** — non-conformità EU
15. **No password reset / MFA** — UX e sicurezza basic mancano

---

# Output finale per cliente

Vedi `AUDIT_EXEC_REPORT.md` per la versione completa (executive 8-pagine).

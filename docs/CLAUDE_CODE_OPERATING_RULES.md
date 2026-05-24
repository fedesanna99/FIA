# Claude Code · Operating Rules (v1)

> Regole permanenti che valgono per **ogni brief**. Claude Code legge
> questo file una volta a inizio sessione. I brief individuali possono
> dire "applica OPERATING_RULES.md" invece di ripetere boilerplate.
>
> **Branch atteso**: `test`. **Main flow**: feature → test → main (sempre
> sincroni). **Pattern**: 1 task atomico = 1 commit + 1 test + 1 verify.

---

## Setup check standard (eseguire a inizio brief)

```bash
git rev-parse --abbrev-ref HEAD                # deve essere 'test'
git rev-parse --short HEAD                     # nota SHA per il report
git status                                     # working tree pulito
cat frontend/src/lib/version.ts | grep -i version
```

**STOP se**:
- Branch ≠ `test`
- Working tree sporco con file `.ts`/`.py`/`.json` modificati che non
  sono parte del brief (file `.md` o build artifact gitignored vanno bene)
- Version inattesa (es. brief richiede v2.3+ e siamo a v1.9)

In caso di STOP: documenta esattamente cosa non torna, attendi risposta utente.

---

## Quality gate standard (eseguire a fine ogni task)

### Backend (se hai toccato `.py`)

```bash
cd backend
pytest --tb=short 2>&1 | tail -10
```

**Criteri**:
- PASS count = baseline PASS + N nuovi test del task
- FAIL count ≤ baseline FAIL (mai aumentare)
- Test specifico del task in PASS

**Baseline corrente** (post v2.4.1):
- 1403 PASS, 12 FAIL pre-esistenti (test_pushover × 7, services/providers × 4, billing/estimator × 1)

### Frontend (se hai toccato `.ts`/`.tsx`)

```bash
cd frontend
node_modules/.bin/tsc --noEmit                 # 0 errori
node_modules/.bin/vitest run 2>&1 | tail -5    # 584/584
```

**STOP se**:
- tsc errori > 0
- vitest perde test (584 → meno)
- Backend FAIL count aumenta oltre baseline

In caso di STOP per regressione: NON committare il task corrente, documenta
quale test pre-esistente è andato in regressione, attendi risposta utente.

---

## Pattern atomico standard

Per ogni task atomico (BEFORE → modifica → AFTER → quality gate → commit):

1. **Verifica nel codice** prima di modificare (`grep`, `sed -n Xp`, `head`)
2. **Modifica chirurgica** (solo le righe necessarie, niente refactor opportunistico)
3. **Quality gate del task** (almeno 1 test nuovo + verifica esistenti)
4. **Commit atomico** con messaggio strutturato:
   ```
   <tipo>(<scope>): <titolo breve> (<sprint-id> T<n>)

   <descrizione tecnica>
   <impatto sul comportamento>
   <riferimento bug/audit se applicabile>
   ```
   Tipi: `feat`, `fix`, `refactor`, `test`, `docs`, `diag`
5. **NO sync intermedio** fra task — sync solo a fine sprint

---

## Sync standard (fine sprint, dopo tutti i task)

```bash
git pull --ff-only origin test
git push origin test:test
git push origin test:main
```

**Verifica post-sync**:
```bash
git rev-parse test main origin/test origin/main
# Tutti e 4 devono essere allo stesso SHA
```

**MAI**:
- `git push --force` o `--force-with-lease` (eccezione documentata solo per
  riallineamento branch una tantum, mai dentro un brief di lavoro normale)
- `git commit --no-verify`
- `git merge --no-ff` non richiesto esplicitamente

---

## Tag standard (fine sprint, dopo sync)

```bash
git tag -a v<N.M.X>-<slug> -m "v<N.M.X>-<slug> — <one-line summary>"
git push origin v<N.M.X>-<slug>
```

Versioning:
- **vN.M.X-<slug>**: release minore (es. `v2.4.2-legal-security`)
- **vN.M.Xbis-<slug>**: extension dello stesso scope (es. `v2.4.0bis-safe-spsolve-extend`)
- **vN.M.X.y-<slug>**: hotfix puntuale (es. `v2.4.1.1-stirrups-edge-case`)

NO tag intermedi nel brief (1 brief = 1 tag).

---

## STOP rules automatiche

Claude Code DEVE fermarsi e chiedere all'utente in questi casi (no autopilot):

1. **Regressione test**: pytest FAIL aumenta, vitest perde test, tsc errori
2. **Criterio di accettazione fallito**: il task non raggiunge la soglia richiesta
3. **Diff inatteso**: file modificati che non erano nel scope del brief
4. **Conflitto git su pull --ff-only**: qualcuno ha pushato sul branch
5. **Tempo task > 2× stima**: se task da 30 min sta diventando 1 ora, fermati
6. **Scopri bug serio non in scope**: documenta nel report, NO fix opportunistico
7. **Decisione tecnica con > 1 opzione legittima**: scegli l'opzione safe e
   documenta nel report, NO scelta arbitraria silente

In caso di STOP: documenta nel report di chiusura, **mai abbandonare lavoro a metà**
(commit dello stato parziale come "WIP <descrizione>" se necessario, ma sempre
con working tree pulito a fine brief).

---

## BACKLOG update standard (per ogni bug fixato)

In `BACKLOG.md`, sezione "Chiuso (v1.x → v2.x)":

```markdown
### #<N> · <titolo bug>
**Chiuso**: v<N.M.X>-<slug> (<data>)
**Implementazione**:
- `<file>`: <descrizione modifica>
- `<file>`: <descrizione modifica>
- `<test>` (nuovo): <N> test regressione

**Comportamento ora**:
- BEFORE: <esempio bug>
- AFTER:  <esempio fixato>

**Riferimenti**:
- Audit: `docs/<audit_doc>.md`
- Investigation (se applicabile): `docs/<investigation>.md`
```

Se il bug **non era ancora in BACKLOG** (es. emerso durante audit), aggiungi
direttamente in "Chiuso" come closure record con stessa struttura.

---

## Report di chiusura standard

Per ogni sprint, crea `docs/<sprint-id>_report.md`:

```markdown
# <sprint-id> · Report

**Data**: <data>
**Branch**: test (SHA: <new sha>)
**Tipo**: <bugfix | feat | refactor | diag>

## Sintesi
<1-2 frasi su cosa è stato chiuso>

## Task completati
- T1: <titolo task> — <esito breve>
- T2: ...

## File toccati
- <file> (+N/-M righe)
- <file> (nuovo, ~N righe)
- <test> (nuovo, ~N righe)

## Quality gates
- ✅ pytest: <N> PASS (+<N> nuovi), <N> FAIL pre-esistenti invariati
- ✅ tsc: 0 errori
- ✅ vitest: 584/584 PASS

## Comportamento BEFORE/AFTER (per bugfix)
<esempio concreto del bug riprodotto e verificato fixato>

## Backward compatibility (se applicabile)
<note su caller esistenti, schema additivo, frontend immutato, ecc.>

## Prossimo passo
<raccomandazione brief successivo>
```

---

## Brief compound (multi-sprint)

Per brief che contengono 3-5 sprint in sequenza:

1. Esegui sprint 1 completo (setup → tasks → quality gate → commit → sync → tag → report)
2. **PRE-FLIGHT del prossimo sprint**: ri-applica setup check (working tree
   deve essere pulito post-tag) e verifica baseline ancora valida
3. Esegui sprint 2 completo
4. ... iterazione fino a fine compound

**STOP automatico fra sprint** se:
- Quality gate del precedente fallito (anche se commit fatto)
- Pre-flight del prossimo trova divergenza
- Una delle STOP rules sopra è scattata

In caso di STOP a sprint N di un compound: chiudi N completamente (sync + tag
+ report), poi fermati. NON proseguire a N+1 finché utente non conferma.

---

## Investigation phase (per fix con > 1 caller)

Se il brief richiede modifica di una funzione con potenzialmente > 1 caller
upstream, eseguire phase 1 di investigation prima del fix:

1. `grep -rn "<function_name>" backend/ frontend/ --include="*.py" --include="*.ts"`
2. Mappa caller, schema, frontend usage
3. Scrivi `docs/<sprint-id>_investigation_report.md`
4. **STOP**: attendi conferma utente prima di phase 2 (fix)

Esempio già fatto: `docs/v2_4_1_investigation_report.md`.

Skip della phase 1 ammesso solo se:
- Il brief dice esplicitamente "1 solo caller noto, no investigation needed"
- O la funzione è privata (`_function`) e usata in 1 solo file

---

## Convenzioni naming

- **File test**: `test_<feature>_<aspect>.py` (es. `test_solver_singular_matrix.py`)
- **File report**: `docs/<sprint-id>_<slug>_report.md`
- **Sprint-id**: `v<major>.<minor>.<patch>[-<slug>]`
- **Commit scope**: `solver`, `ec2`, `ec3`, `api`, `frontend`, `docs`, `test`

---

## Note di sicurezza permanenti

1. **MAI** modificare codice senza verificare baseline pytest/vitest prima
2. **MAI** eliminare test esistenti per far passare regression
3. **MAI** ridurre severità di un bug nel BACKLOG senza richiesta esplicita
4. **MAI** committare credenziali, token, chiavi API
5. **MAI** modificare `requirements.txt`, `package.json`, lock files senza brief
6. **SEMPRE** documentare deviazioni dalle istruzioni nel report di chiusura

---

## Cosa NON fare (anti-pattern)

- Refactor opportunistico (vedi codice "feo" mentre fixi bug → lascia stare)
- "Mentre siamo qui" (espansione di scope fuori brief)
- Salva-stato locale con `git stash` come abitudine (lavorare sempre clean)
- Reset hard senza backup (`git reset --hard` solo se rebaseable, mai dopo push)
- Skip dei test "perché sono lenti" o "perché sono pre-esistenti rotti"

---

**Versione**: v1 (2026-05-24)
**Prossima review**: dopo 5 sprint usando queste rules

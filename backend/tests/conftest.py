"""Pytest configuration — assicura che 'backend/' sia in sys.path
+ disabilita il tracker F6 singleton per evitare pollution .cache/usage.sqlite."""
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Disable solo il SINGLETON globale del tracker F6 (no env var: cosi' le nuove
# istanze UsageTracker(db_path=tmp) restano enabled di default).
# I test F6 che testano il singleton usano la fixture `with_global_tracker`
# per riabilitarlo temporaneamente con tmp DB.
try:
    from services.usage_tracker import tracker as _tracker
    _tracker.set_enabled(False)
except Exception:
    pass

/**
 * GlobalRoutingListeners · v3.1.2 audit-fix L2-8 + L2-P0#1/#2
 *
 * Componente "invisibile" montato in main.tsx SOTTO `<BrowserRouter>` ma
 * SOPRA `<Routes>`. Vive cross-route quindi i listener `feapro:*` globali
 * sono attivi anche quando l'utente è su `/templates`, `/settings`,
 * `/percorsi/uc1` ecc. — non solo su `/` come prima (quando App.tsx era
 * l'unico host dei listener).
 *
 * Listener gestiti qui:
 *   - `feapro:open-help`              → navigate("/", { state: { openHelp: true } })
 *   - `feapro:open-billing`           → navigate("/settings?section=billing")
 *   - `feapro:open-percorso-uc1`      → navigate("/percorsi/uc1")
 *   - `feapro:open-account-dialog`    → navigate("/settings?section=account")
 *   - `feapro:open-new-model`         → navigate("/", { state: { openNewModel: true } })
 *   - `feapro:load-template`          → navigate("/", { state: { pendingActiveId: id } })
 *
 * App.tsx legge `location.state` al mount e fa il dispatch al state corretto
 * (setActiveId, setNewModelOpen, setDialog). Lo state viene poi resettato
 * via `navigate(replace)` per evitare retrigger su back/forward del browser.
 *
 * v3.1.2 audit fix:
 *   - L2-P0#1: il dispatch+navigate race in TemplatesPage non aveva listener
 *     attivo (App montato solo su `path="*"`). Ora il listener è cross-route.
 *   - L2-P0#2: stesso pattern per `feapro:open-new-model` dal bottone
 *     "Modello vuoto" in TemplatesPage.
 *   - L2-8 (root cause): listener legati al lifecycle di App significava che
 *     andassero giù ogni volta che l'utente lasciava `/`.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";


export function GlobalRoutingListeners(): null {
  const navigate = useNavigate();

  useEffect(() => {
    const openHelp = () => {
      navigate("/", { state: { openHelp: true } });
    };
    const openBilling = () => {
      navigate("/settings?section=billing");
    };
    const openPercorsoUC1 = () => {
      navigate("/percorsi/uc1");
    };
    const openAccountDialog = () => {
      navigate("/settings?section=account");
    };
    const openNewModel = () => {
      navigate("/", { state: { openNewModel: true } });
    };
    const onLoadTemplate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { templateId?: string } | undefined;
      if (detail?.templateId) {
        navigate("/", { state: { pendingActiveId: detail.templateId } });
      }
    };

    window.addEventListener("feapro:open-help", openHelp);
    window.addEventListener("feapro:open-billing", openBilling);
    window.addEventListener("feapro:open-percorso-uc1", openPercorsoUC1);
    window.addEventListener("feapro:open-account-dialog", openAccountDialog);
    window.addEventListener("feapro:open-new-model", openNewModel);
    window.addEventListener("feapro:load-template", onLoadTemplate);

    return () => {
      window.removeEventListener("feapro:open-help", openHelp);
      window.removeEventListener("feapro:open-billing", openBilling);
      window.removeEventListener("feapro:open-percorso-uc1", openPercorsoUC1);
      window.removeEventListener("feapro:open-account-dialog", openAccountDialog);
      window.removeEventListener("feapro:open-new-model", openNewModel);
      window.removeEventListener("feapro:load-template", onLoadTemplate);
    };
  }, [navigate]);

  return null;
}

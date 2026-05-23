import { useQuery } from "@tanstack/react-query";
import { modelsApi } from "../../api/client";
import { useModelStore } from "../../store/modelStore";
import type { ValidationIssue } from "../../api/client";

const COLOR: Record<string, string> = {
  error: "text-accent-danger",
  warning: "text-accent-warning",
  info: "text-accent-primary",
};

const ICON: Record<string, string> = {
  error: "✕",
  warning: "⚠",
  info: "ⓘ",
};

export function ValidationPanel() {
  const model = useModelStore((s) => s.model);
  const selectNode = useModelStore((s) => s.selectNode);
  const selectElement = useModelStore((s) => s.selectElement);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["validate", model?.id],
    queryFn: () => modelsApi.validate(model!.id),
    enabled: !!model,
    refetchOnMount: true,
  });

  const onIssueClick = (iss: ValidationIssue) => {
    if (iss.entity_id == null) return;
    if (iss.entity_type === "node") selectNode(iss.entity_id, false);
    else if (iss.entity_type === "element") selectElement(iss.entity_id, false);
    /* per load/constraint non c'è ancora una selezione dedicata */
  };

  if (!model) {
    return (
      <div className="p-4 text-xs text-ink-3">
        Nessun modello caricato.
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-4 text-xs text-ink-3">Validazione in corso…</div>;
  }

  if (!data) return null;

  const ok = data.errors === 0 && data.warnings === 0;

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {ok ? (
            <span className="text-accent-success font-semibold">● Modello valido</span>
          ) : (
            <span className="text-ink">
              <span className="text-accent-danger numeric">{data.errors}</span> errori,{" "}
              <span className="text-accent-warning numeric">{data.warnings}</span> warning
            </span>
          )}
        </div>
        <button
          className="btn text-[10px] py-0.5 px-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "..." : "↻ Verifica"}
        </button>
      </div>

      {ok && (
        <div className="p-4 text-ink-3 text-center text-[11px]">
          Tutti i controlli sono OK.<br />
          Il modello è pronto per l'analisi.
        </div>
      )}

      {!ok && (
        <div className="divide-y divide-border">
          {data.issues.map((iss, idx) => {
            const clickable = (iss.entity_type === "node" || iss.entity_type === "element") && iss.entity_id != null;
            return (
              <div
                key={idx}
                className={`px-3 py-2 hover:bg-bg-hover ${clickable ? "cursor-pointer" : ""}`}
                onClick={() => clickable && onIssueClick(iss)}
                title={clickable ? "Click per selezionare nel viewport" : undefined}
              >
                <div className="flex gap-2 items-start">
                  <span className={`${COLOR[iss.level]} font-bold mt-0.5`}>{ICON[iss.level]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-ink">{iss.message}</div>
                    {iss.entity_type && (
                      <div className="text-[10px] text-ink-3 mt-0.5 numeric">
                        {iss.entity_type}{iss.entity_id != null && ` #${iss.entity_id}`}
                        {clickable && <span className="text-accent-primary ml-1">▸ seleziona</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

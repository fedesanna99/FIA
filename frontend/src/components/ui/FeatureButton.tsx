/**
 * FeatureButton (v2.5.6 cluster F T3, DEC-A4).
 *
 * Wrapper di `Button` primitive che integra precondizioni dichiarative:
 *
 *   1. Consulta `checkFeature(featureId, state)` da `lib/preconditions`.
 *   2. Se precondizione OK → invoca `onClick`.
 *   3. Se precondizione manca → button disabled + tooltip italiano (`disabledLabel`).
 *   4. Se `proposeActionOnDisabledClick={true}` + `disabledAction` definita →
 *      click su disabled lancia `onProposeAction(disabledAction)` invece di
 *      essere no-op (chiude BUG-031: "Verify > Live" empty state → propone
 *      `run-static` invece di mostrare panel vuoto).
 *
 * Riusa il `Button` primitive esistente: stesso stile (variant/size), stesso
 * comportamento `loading`, stesso disabled visual. Nessuna duplicazione CSS.
 *
 * Pattern:
 *   <FeatureButton featureId="run-static" onClick={runAnalysis}>Esegui</FeatureButton>
 *   <FeatureButton
 *     featureId="verify-ec3"
 *     onClick={openEC3}
 *     proposeActionOnDisabledClick
 *     onProposeAction={(action) => action === "run-static" && runAnalysis()}
 *   >EC3</FeatureButton>
 */
import { useMemo, type ReactNode } from "react";
import { Button, type ButtonVariant, type ButtonSize } from "./Button";
import { Tooltip } from "./Tooltip";
import { checkFeature, type FeatureId } from "../../lib/preconditions";
import { useFeaturePreconditionState } from "../../hooks/usePreconditions";

interface FeatureButtonProps {
  featureId: FeatureId;
  onClick: () => void;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  /** Se true, click su button disabled propone l'azione `disabledAction` (se definita nel registry). */
  proposeActionOnDisabledClick?: boolean;
  /** Callback invocato con `disabledAction` quando button è disabled + proposeActionOnDisabledClick=true. */
  onProposeAction?: (action: FeatureId) => void;
  /** Forza l'override del tooltip disabled (es. per messaggi contestuali). */
  disabledLabelOverride?: string;
  "data-testid"?: string;
  "aria-label"?: string;
}

export function FeatureButton(props: FeatureButtonProps) {
  const {
    featureId,
    onClick,
    children,
    variant,
    size,
    loading,
    iconLeft,
    iconRight,
    className,
    proposeActionOnDisabledClick = false,
    onProposeAction,
    disabledLabelOverride,
    "data-testid": dataTestid,
    "aria-label": ariaLabel,
  } = props;

  const state = useFeaturePreconditionState();
  const availability = useMemo(() => checkFeature(featureId, state), [featureId, state]);

  const interactiveDisabled =
    !availability.available && !(proposeActionOnDisabledClick && availability.disabledAction);

  const handleClick = (): void => {
    if (loading) return;
    if (availability.available) {
      onClick();
      return;
    }
    if (
      proposeActionOnDisabledClick &&
      availability.disabledAction &&
      onProposeAction
    ) {
      onProposeAction(availability.disabledAction);
    }
  };

  const tooltipContent: ReactNode = availability.available
    ? null
    : (
      <div className="space-y-1">
        <p>{disabledLabelOverride ?? availability.disabledLabel}</p>
        {availability.disabledActionLabel && proposeActionOnDisabledClick && (
          <p className="text-[10px] opacity-70">
            Click per: {availability.disabledActionLabel}
          </p>
        )}
      </div>
    );

  const button = (
    <Button
      type="button"
      variant={variant}
      size={size}
      loading={loading}
      iconLeft={iconLeft}
      iconRight={iconRight}
      className={className}
      onClick={handleClick}
      disabled={interactiveDisabled}
      data-feature-id={featureId}
      data-precondition-available={availability.available}
      data-testid={dataTestid}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );

  if (!tooltipContent) return button;
  return <Tooltip content={tooltipContent}>{button}</Tooltip>;
}

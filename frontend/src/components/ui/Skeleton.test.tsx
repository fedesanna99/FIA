/**
 * Skeleton.test.tsx (Precision v2.0 PR6) — placeholder shimmer.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renderizza base con dimensions", () => {
    const { container } = render(<Skeleton width="50%" height={12} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("50%");
    expect(el.style.height).toBe("12px");
  });

  it("ha aria-hidden", () => {
    const { container } = render(<Skeleton width="100%" height={10} />);
    expect((container.firstChild as HTMLElement).getAttribute("aria-hidden")).toBe("true");
  });

  it("applica animate-shimmer via pseudo-element", () => {
    const { container } = render(<Skeleton width="50px" height={10} />);
    expect((container.firstChild as HTMLElement).className).toContain("after:animate-shimmer");
  });

  it("Skeleton.Row renderizza w-100% h-12", () => {
    const { container } = render(<Skeleton.Row />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe("100%");
    expect(el.style.height).toBe("12px");
  });

  it("Skeleton.Block renderizza w-100% h-60", () => {
    const { container } = render(<Skeleton.Block />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.height).toBe("60px");
  });
});

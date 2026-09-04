import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProofStrip } from "@/components/sections/proof-strip";
import type { Project, Service } from "@/lib/api/types";

function times<T>(n: number, make: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => make(i));
}

describe("ProofStrip", () => {
  it("shows only real, derived counts and never an invented metric", () => {
    const projects = times(3, (i) => ({ id: i }) as Project);
    const services = times(2, (i) => ({ id: i }) as Service);

    render(<ProofStrip projects={projects} experiences={[]} education={[]} services={services} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Published projects")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Service categories")).toBeInTheDocument();
    // No years-of-experience, client-count, or success-rate claim exists
    // anywhere in the backend - none should ever appear here.
    expect(screen.queryByText(/years|clients|success rate|%/i)).not.toBeInTheDocument();
  });

  it("omits a metric entirely rather than showing a zero or a placeholder", () => {
    render(<ProofStrip projects={[]} experiences={null} education={[]} services={[]} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders nothing when every source list is empty or unavailable", () => {
    const { container } = render(<ProofStrip projects={[]} experiences={null} education={[]} services={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

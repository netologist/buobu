import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock the store so tests control isOpen directly
vi.mock("@/stores/apps-bar-store", () => ({
	useAppsBarStore: vi.fn(),
}));

// Override global usePathname to return /habits for active-state tests
vi.mock("next/navigation", () => ({
	usePathname: () => "/habits",
	useRouter: () => ({ push: vi.fn() }),
}));

// Stub the shared tooltip component — it uses portals which don't render in jsdom
vi.mock("@/components/ui/tooltip", () => ({
	TooltipProvider: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	Tooltip: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	TooltipTrigger: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
	TooltipContent: ({ children }: { children: React.ReactNode }) =>
		React.createElement(React.Fragment, null, children),
}));

import { AppsBar } from "../AppsBar";
import { useAppsBarStore } from "@/stores/apps-bar-store";

const mockToggle = vi.fn();

beforeEach(() => {
	vi.mocked(useAppsBarStore).mockReturnValue({
		isOpen: true,
		toggle: mockToggle,
	});
});

describe("AppsBar", () => {
	it("renders all 8 app navigation links", () => {
		render(<AppsBar />);
		expect(screen.getByRole("link", { name: /tasks/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /routines/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /time blocks/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /habits/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /notes/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /bookmarks/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /whiteboards/i })).toBeDefined();
		expect(screen.getByRole("link", { name: /mindmaps/i })).toBeDefined();
	});

	it('marks the active route link with aria-current="page"', () => {
		// usePathname is mocked to '/habits'
		render(<AppsBar />);
		const habitsLink = screen.getByRole("link", { name: /habits/i });
		expect(habitsLink.getAttribute("aria-current")).toBe("page");
	});

	it("does not mark inactive links with aria-current", () => {
		render(<AppsBar />);
		const tasksLink = screen.getByRole("link", { name: /tasks/i });
		expect(tasksLink.getAttribute("aria-current")).toBeNull();
	});

	 it("renders with w-[50px] class when isOpen is true", () => {
		const { container } = render(<AppsBar />);
	  expect(container.querySelector("nav")?.className).toContain("w-[50px]");
	});

	it("renders with w-0 class when isOpen is false", () => {
		vi.mocked(useAppsBarStore).mockReturnValue({
			isOpen: false,
			toggle: mockToggle,
		});
		const { container } = render(<AppsBar />);
		expect(container.querySelector("nav")?.className).toContain("w-0");
	});
});

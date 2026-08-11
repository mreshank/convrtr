import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DropField } from "../DropField";

const accept = { mime: ["image/png"], ext: ["png"] };

describe("DropField", () => {
	it("renders the accepted formats as chips", () => {
		render(<DropField accept={accept} formats={["PNG"]} onFiles={vi.fn()} />);
		expect(screen.getByText("PNG")).toBeDefined();
	});

	it("emits accepted files on drop", () => {
		const onFiles = vi.fn();
		render(<DropField accept={accept} formats={["PNG"]} onFiles={onFiles} />);
		const file = new File([], "a.png", { type: "image/png" });
		fireEvent.drop(screen.getByTestId("drop-field"), {
			dataTransfer: { files: [file] },
		});
		expect(onFiles).toHaveBeenCalledWith([file]);
	});

	it("filters out files that do not match the accept rule", () => {
		const onFiles = vi.fn();
		render(<DropField accept={accept} formats={["PNG"]} onFiles={onFiles} />);
		const bad = new File([], "a.gif", { type: "image/gif" });
		fireEvent.drop(screen.getByTestId("drop-field"), {
			dataTransfer: { files: [bad] },
		});
		expect(onFiles).not.toHaveBeenCalled();
	});

	it("marks itself active while dragging over", () => {
		render(<DropField accept={accept} formats={["PNG"]} onFiles={vi.fn()} />);
		const field = screen.getByTestId("drop-field");
		fireEvent.dragOver(field);
		expect(field.getAttribute("data-active")).toBe("true");
		fireEvent.dragLeave(field);
		expect(field.getAttribute("data-active")).toBe("false");
	});

	it("is reachable and operable by keyboard", () => {
		render(<DropField accept={accept} formats={["PNG"]} onFiles={vi.fn()} />);
		const field = screen.getByTestId("drop-field");
		expect(field.getAttribute("role")).toBe("button");
		expect(field.getAttribute("tabindex")).toBe("0");
	});
});

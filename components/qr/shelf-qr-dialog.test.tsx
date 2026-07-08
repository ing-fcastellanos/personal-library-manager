import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShelfQrDialog } from "./shelf-qr-dialog";
import QRCode from "qrcode";

/** Component tests for the per-shelf QR dialog (#33). */
vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn().mockResolvedValue(undefined) },
}));

function open() {
  render(
    <ShelfQrDialog
      shelfId="s1"
      shelfName="Living"
      trigger={<button type="button">Ver QR</button>}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Ver QR" }));
}

describe("ShelfQrDialog", () => {
  it("opens showing the shelf's name and a QR encoding action=add&shelf=<id>", async () => {
    open();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Living" })).toBeInTheDocument();
    expect(QRCode.toCanvas).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/\/scan\?action=add&shelf=s1$/),
      expect.anything(),
    );
  });

  it("renders the print-only tile only while the dialog is open", async () => {
    const { unmount } = render(
      <ShelfQrDialog
        shelfId="s1"
        shelfName="Living"
        trigger={<button type="button">Ver QR</button>}
      />,
    );
    expect(screen.queryByText(/Escaneá con la cámara/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver QR" }));
    expect(
      await screen.findByText(/Escaneá con la cámara/),
    ).toBeInTheDocument();

    unmount();
  });

  it("calls window.print() when Imprimir is activated", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    open();
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });
});

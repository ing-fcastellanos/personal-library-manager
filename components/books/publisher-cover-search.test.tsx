import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PublisherCoverSearch } from "./publisher-cover-search";

/**
 * Component tests for the presentational publisher-cover-search widget (#22):
 * one render per phase from the handed-off prototype, plus the interactions
 * that must call back to the caller (typing, picking, "Listo").
 */

const baseProps = {
  publisher: "Sudamericana",
  onPublisherChange: vi.fn(),
  selectedId: null,
  onPick: vi.fn(),
  singleCaption: "",
  onDone: vi.fn(),
  inputId: "pcs-test",
};

describe("PublisherCoverSearch", () => {
  it("renders the Editorial input and reports edits", () => {
    const onPublisherChange = vi.fn();
    render(
      <PublisherCoverSearch
        {...baseProps}
        phase="idle"
        options={[]}
        onPublisherChange={onPublisherChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Editorial"), {
      target: { value: "Debolsillo" },
    });
    expect(onPublisherChange).toHaveBeenCalledWith("Debolsillo");
  });

  it("shows the searching state", () => {
    render(
      <PublisherCoverSearch {...baseProps} phase="searching" options={[]} />,
    );
    expect(
      screen.getByText("Buscando portada para esta editorial…"),
    ).toBeInTheDocument();
  });

  it("shows a pickable option for each multi-match candidate", () => {
    const onPick = vi.fn();
    render(
      <PublisherCoverSearch
        {...baseProps}
        phase="multi"
        onPick={onPick}
        options={[
          {
            id: "1",
            coverUrl: "https://covers.example/a.jpg",
            caption: "2019 · Debolsillo",
          },
          {
            id: "2",
            coverUrl: "https://covers.example/b.jpg",
            caption: "2013 · Alfaguara",
          },
        ]}
      />,
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    fireEvent.click(screen.getByText("2013 · Alfaguara").closest("button")!);
    expect(onPick).toHaveBeenCalledWith("2");
  });

  it("shows the single-match confirmation and caption", () => {
    render(
      <PublisherCoverSearch
        {...baseProps}
        phase="single"
        options={[]}
        singleCaption="2019 · Debolsillo"
      />,
    );
    expect(screen.getByText("Portada actualizada")).toBeInTheDocument();
    expect(screen.getByText(/2019 · Debolsillo/)).toBeInTheDocument();
  });

  it("shows the no-results empty state without altering anything destructive", () => {
    render(<PublisherCoverSearch {...baseProps} phase="none" options={[]} />);
    expect(
      screen.getByText("No encontramos portada para esa editorial"),
    ).toBeInTheDocument();
  });

  it('calls onDone from the multi and single "Listo" buttons', () => {
    const onDone = vi.fn();
    const { rerender } = render(
      <PublisherCoverSearch
        {...baseProps}
        phase="single"
        options={[]}
        onDone={onDone}
        singleCaption="2019 · Debolsillo"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalledTimes(1);

    rerender(
      <PublisherCoverSearch
        {...baseProps}
        phase="multi"
        options={[
          {
            id: "1",
            coverUrl: "https://covers.example/a.jpg",
            caption: "2019",
          },
        ]}
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("shows the header only when showHeader is set", () => {
    const { rerender } = render(
      <PublisherCoverSearch
        {...baseProps}
        phase="idle"
        options={[]}
        showHeader
        bookTitle="Rayuela"
      />,
    );
    expect(
      screen.getByText("Editando editorial de «Rayuela»"),
    ).toBeInTheDocument();

    rerender(<PublisherCoverSearch {...baseProps} phase="idle" options={[]} />);
    expect(screen.queryByText(/Editando editorial/)).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AutoRestartToggle,
  isAutoRestartClientEnabled,
  isGroupRestartSuppressed,
} from "@/components/providers/AutoRestartToggle";

const restartMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock("@/lib/api/clientRestart", () => ({
  appSupportsClientRestart: () => true,
  clientRestartApi: {
    restart: (...args: unknown[]) => restartMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AutoRestartToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    restartMock.mockReset();
    toastSuccessMock.mockReset();
  });

  it("persists both automatic restart settings", () => {
    render(<AutoRestartToggle activeApp="codex" />);

    const [autoRestartSwitch, groupSkipSwitch] = screen.getAllByRole("switch");
    fireEvent.click(autoRestartSwitch);
    expect(isAutoRestartClientEnabled()).toBe(true);

    fireEvent.click(groupSkipSwitch);
    expect(isGroupRestartSuppressed()).toBe(false);
  });

  it("restarts the active client when the restart icon is clicked", async () => {
    restartMock.mockResolvedValue({
      app: "codex",
      killed: true,
      killAttempts: 1,
      launched: true,
      supported: true,
      message: "restarted",
    });
    render(<AutoRestartToggle activeApp="codex" />);

    fireEvent.click(screen.getByRole("button", { name: /Codex/ }));

    await waitFor(() => expect(restartMock).toHaveBeenCalledWith("codex"));
    expect(toastSuccessMock).toHaveBeenCalledWith("restarted");
  });
});

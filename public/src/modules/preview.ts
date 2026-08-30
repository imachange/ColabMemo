export type PreviewModule = { init: () => void; destroy: () => void };

export const createPreviewModule = (): PreviewModule => {
  const preview = document.getElementById("preview");
  const editor = document.getElementById("editor") as HTMLTextAreaElement | null;
  if (!preview || !editor) {
    return { init: () => undefined, destroy: () => undefined };
  }

  const sync = () => {
    preview.textContent = editor.value;
  };

  return {
    init() {
      editor.addEventListener("input", sync);
      sync();
      preview.removeAttribute("hidden");
    },
    destroy() {
      editor.removeEventListener("input", sync);
      preview.setAttribute("hidden", "true");
      preview.textContent = "";
    },
  };
};

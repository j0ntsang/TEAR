// Theme controls, shared by the popup and the options page.

(() => {
  const { FONTS, DEFAULT_THEME } = TEAR;

  const COLORS = [
    ["bgColor", "Background"],
    ["panelBg", "Panels"],
    ["textColor", "Text"],
    ["linkColor", "Links"],
  ];

  /**
   * Fills `form` with controls for `theme`; `onChange` gets the whole new
   * theme on every edit (colors fire continuously while dragging the picker).
   */
  function renderThemeForm(form, theme, onChange) {
    let current = { ...theme };
    const emit = (patch) => {
      current = { ...current, ...patch };
      onChange(current);
    };
    form.replaceChildren();

    for (const [key, label] of COLORS) {
      const input = Object.assign(document.createElement("input"), { type: "color", value: current[key] });
      input.addEventListener("input", () => emit({ [key]: input.value }));
      form.append(field(label, input));
    }

    const font = document.createElement("select");
    for (const { label, value } of FONTS) font.append(new Option(label, value, false, value === current.fontFamily));
    font.addEventListener("change", () => emit({ fontFamily: font.value }));
    form.append(field("Font", font));

    const size = Object.assign(document.createElement("input"), { type: "number", min: 0, max: 32, value: current.fontSize });
    size.addEventListener("change", () => {
      const n = Math.round(Number(size.value));
      if (Number.isInteger(n) && n >= 0 && n <= 32) emit({ fontSize: n });
      else size.value = current.fontSize;
    });
    const sizeField = field("Size (px)", size);
    sizeField.title = "0 keeps Torn's own sizes";
    form.append(sizeField);

    const reset = Object.assign(document.createElement("button"), { type: "button", textContent: "Reset theme" });
    reset.addEventListener("click", () => {
      emit({ ...DEFAULT_THEME });
      renderThemeForm(form, current, onChange);
    });
    form.append(reset);
  }

  function field(text, control) {
    const label = document.createElement("label");
    label.className = "field";
    label.append(Object.assign(document.createElement("span"), { textContent: text }), control);
    return label;
  }

  /**
   * `fn`, run after `ms` of quiet (storage.sync caps writes per minute).
   * `.flush()` runs a pending call now, e.g. before the popup closes.
   */
  function debounce(fn, ms = 300) {
    let timer = 0;
    const run = () => {
      timer = 0;
      fn();
    };
    const debounced = () => {
      clearTimeout(timer);
      timer = setTimeout(run, ms);
    };
    debounced.flush = () => {
      if (!timer) return;
      clearTimeout(timer);
      run();
    };
    return debounced;
  }

  Object.assign(TEAR, { renderThemeForm, debounce });
})();

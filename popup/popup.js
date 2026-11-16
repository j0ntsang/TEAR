(async () => {
  const { FONTS, DEFAULT_THEME, getTheme, saveTheme } = TEAR;
  const bg = document.getElementById("bg");
  const font = document.getElementById("font");
  let theme = await getTheme();

  // storage.sync caps writes per minute, and the color picker fires on every drag step.
  let timer = 0;
  const flush = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = 0;
    saveTheme(theme);
  };
  const saveSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(flush, 300);
  };
  // Closing the popup would drop a pending save.
  document.addEventListener("visibilitychange", () => document.hidden && flush());

  font.append(...FONTS.map(({ label, value }) => new Option(label, value)));

  function render() {
    bg.value = theme.bgColor;
    font.value = theme.fontFamily;
  }

  bg.addEventListener("input", () => {
    theme = { ...theme, bgColor: bg.value };
    saveSoon();
  });
  font.addEventListener("change", () => {
    theme = { ...theme, fontFamily: font.value };
    saveTheme(theme);
  });
  document.getElementById("reset").addEventListener("click", () => {
    theme = { ...DEFAULT_THEME };
    saveTheme(theme);
    render();
  });

  render();
})();

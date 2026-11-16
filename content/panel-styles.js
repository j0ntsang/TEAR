// The settings and info panels' styles, adopted by their shadow roots: kept in a script so no
// extension file has to be web-accessible (a page could probe for one to detect TEAR).
globalThis.TEAR.panelStyles = new CSSStyleSheet();
TEAR.panelStyles.replaceSync(`
:host {
  --bg: #f7f7f7;
  --surface: #ffffff;
  --fg: #222222;
  --muted: #666666;
  --line: #d6d6d6;
  --accent: #6e3a9c;
  --focus: #0a58ca;
  all: initial;
  position: fixed;
  z-index: 2147483000;
  right: var(--right, 8px);
  bottom: var(--bottom, 48px);
  color-scheme: light;
}

:host([data-mode="dark"]) {
  --bg: #1f1f1f;
  --surface: #2a2a2a;
  --fg: #e6e6e6;
  --muted: #a0a0a0;
  --line: #3d3d3d;
  --accent: #b48ee0;
  --focus: #93c5fd;
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

.panel {
  display: flex;
  flex-direction: column;
  width: 300px;
  max-height: min(70vh, 560px);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--fg);
  font: 13px/1.4 Arial, Helvetica, sans-serif;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

[hidden]:not(.panel) {
  display: none !important;
}

.panel {
  transform-origin: bottom right;
  transition: opacity 160ms cubic-bezier(0.2, 0.8, 0.2, 1), scale 160ms cubic-bezier(0.2, 0.8, 0.2, 1),
    translate 160ms cubic-bezier(0.2, 0.8, 0.2, 1), display 110ms allow-discrete;
}

.panel[hidden] {
  display: none;
  opacity: 0;
  scale: 0.96;
  translate: 0 6px;
  transition-duration: 110ms;
  transition-timing-function: cubic-bezier(0.4, 0, 1, 1);
}

@starting-style {
  .panel:not([hidden]) {
    opacity: 0;
    scale: 0.96;
    translate: 0 6px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel {
    transition: none;
  }
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--line);
}

h2 {
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.08em;
}

h3 {
  margin: 12px 0 4px;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

button,
select,
input {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
}

:is(button, select, input):focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}

.close {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  font-size: 18px;
  line-height: 1;
}

.close:hover {
  background: color-mix(in srgb, var(--fg) 10%, transparent);
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--line);
}

[role="tab"] {
  padding: 6px 10px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--muted);
  margin-bottom: -1px;
}

[role="tab"]:hover {
  color: var(--fg);
}

[role="tab"][aria-selected="true"] {
  border-color: var(--line);
  background: var(--surface);
  color: var(--fg);
  font-weight: 600;
  box-shadow: inset 0 2px 0 var(--accent);
}

.pane {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 12px;
  background: var(--surface);
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

select {
  max-width: 170px;
  padding: 3px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 3px 0;
}

.row label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.changed {
  display: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.row.is-changed .changed {
  display: inline-block;
  order: -1;
}

.controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

input[type="color"] {
  width: 32px;
  height: 22px;
  padding: 0 2px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg);
  cursor: pointer;
}

input[type="range"] {
  width: 64px;
  accent-color: var(--accent);
}

.undo {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--muted);
  visibility: hidden;
}

.row.is-changed .undo {
  visibility: visible;
}

.undo:hover {
  background: color-mix(in srgb, var(--fg) 10%, transparent);
  color: var(--fg);
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}

.check input {
  margin: 2px 0 0;
  accent-color: var(--accent);
}

.check small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 11px;
}

.sample {
  margin: 12px 0 0;
  padding: 10px;
  border: 1px dashed var(--line);
  border-radius: 6px;
}

footer {
  padding: 8px 12px;
  border-top: 1px solid var(--line);
}

footer:has(.reset[hidden]) {
  display: none;
}

.reset {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: transparent;
  color: var(--accent);
}

.reset:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.panel.info {
  width: auto;
  min-width: 11rem;
  padding: 10px 14px 12px;
  gap: 2px;
}

.info p {
  margin: 0;
}

.info .label {
  color: var(--muted);
  font-size: 10px;
  font-weight: bold;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.info .clock {
  font-size: 22px;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.info .date {
  color: var(--muted);
}

.info .server {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--line);
  color: var(--muted);
}

.info .server span {
  color: var(--fg);
  font-weight: bold;
}

.panel.info:focus {
  outline: none;
}

.panel.info:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
`);

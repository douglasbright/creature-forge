@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');

:root {
  font-family: Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #edf5ff;
  background: #101a2b;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  --panel: rgba(19, 31, 51, 0.92);
  --panel-soft: rgba(28, 45, 70, 0.78);
  --border: rgba(153, 190, 222, 0.18);
  --muted: #91a9bf;
  --cyan: #65f6e6;
  --green: #73dc91;
  --orange: #ffac67;
  --danger: #ff7186;
}

* { box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; margin: 0; overflow: hidden; }
button, input, select { font: inherit; }
button { color: inherit; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; }

.app-shell {
  display: grid;
  grid-template-columns: 285px minmax(420px, 1fr) 330px;
  grid-template-rows: 70px minmax(0, 1fr);
  width: 100%; height: 100%;
  background: radial-gradient(circle at 45% 20%, #28445d 0%, #17263c 38%, #0e1828 100%);
}
.glass-panel { background: var(--panel); border-color: var(--border); backdrop-filter: blur(18px); }
.topbar {
  grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 15px; border-bottom: 1px solid var(--border); z-index: 20;
}
.brand { display: flex; align-items: center; gap: 11px; min-width: 230px; }
.brand-mark { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 14px; background: linear-gradient(145deg,#71f1cf,#56a8ff); color:#102236; font-weight:900; box-shadow:0 8px 24px rgba(81,211,207,.25); }
.brand strong { display:block; font-size:16px; letter-spacing:-.02em; }
.brand span { display:block; color:var(--muted); font-size:11px; margin-top:1px; }
.top-actions { display:flex; align-items:center; gap:8px; }
.preset-field { display:flex; align-items:center; gap:8px; padding:7px 10px; border:1px solid var(--border); border-radius:12px; color:var(--muted); font-size:11px; }
select, input[type="text"], .field input { background:#15253a; border:1px solid rgba(147,190,223,.25); color:#eef7ff; border-radius:8px; padding:7px 9px; }
.preset-field select { border:0; padding:0 4px; font-weight:700; }
.mode-switch { display:flex; padding:3px; background:#0f1c2f; border:1px solid var(--border); border-radius:12px; }
.mode-switch button { border:0; background:transparent; padding:8px 16px; border-radius:9px; color:var(--muted); font-weight:700; cursor:pointer; }
.mode-switch button.active { color:#102337; background:linear-gradient(135deg,#72f0d2,#79c9ff); }
.icon-button,.soft-button { border:1px solid var(--border); background:#172a41; border-radius:10px; cursor:pointer; }
.icon-button { width:38px; height:38px; font-size:20px; }
.soft-button { padding:9px 12px; font-size:12px; font-weight:700; }
button:disabled { opacity:.35; cursor:not-allowed; }

.palette { grid-column:1; grid-row:2; border-right:1px solid var(--border); padding:18px 14px; overflow:auto; z-index:10; }
.panel-title-row h2,.section-heading h2 { margin:2px 0 0; font-size:16px; }
.eyebrow { color:#6fdacb; font-size:9px; letter-spacing:.16em; font-weight:800; }
.panel-help,.microcopy { color:var(--muted); font-size:11px; line-height:1.55; }
.palette-grid { display:grid; gap:8px; margin:14px 0; }
.palette-item { display:grid; grid-template-columns:45px 1fr 18px; align-items:center; gap:9px; padding:9px; border:1px solid rgba(155,193,224,.13); background:linear-gradient(135deg,rgba(42,66,94,.75),rgba(25,43,67,.8)); border-radius:13px; cursor:grab; user-select:none; transition:.16s ease; }
.palette-item:hover { transform:translateY(-1px); border-color:rgba(101,246,230,.45); background:linear-gradient(135deg,rgba(51,82,108,.9),rgba(29,51,78,.9)); }
.palette-item.dragging { opacity:.42; }
.part-icon { display:grid; place-items:center; width:42px; height:42px; border-radius:12px; background:radial-gradient(circle at 35% 25%,#f6dbc1,#d89d77); color:#563b36; font-size:25px; font-weight:800; box-shadow:inset 0 -5px 12px rgba(111,61,39,.22); }
.palette-item strong { display:block; font-size:12px; }
.palette-item span { display:block; font-size:9px; color:var(--muted); margin-top:2px; }
.drag-dots { color:#5f7891; font-size:15px; }
.symmetry-card { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px; border:1px solid var(--border); border-radius:13px; background:rgba(9,21,35,.45); }
.symmetry-card strong { display:block; font-size:11px; }.symmetry-card span { display:block; color:var(--muted); font-size:9px; margin-top:3px; }
.toggle input { display:none; }.toggle span { display:block; width:40px; height:23px; border-radius:20px; background:#24364b; position:relative; transition:.2s; }
.toggle span::after { content:""; position:absolute; width:17px; height:17px; left:3px; top:3px; background:#7b8fa3; border-radius:50%; transition:.2s; }
.toggle input:checked + span { background:#316e69; }.toggle input:checked + span::after { left:20px; background:#78f0dc; }
.tool-row { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:10px; }
.tool { border:1px solid var(--border); background:#16273c; padding:8px 3px; border-radius:9px; font-size:10px; cursor:pointer; }
.tool.active { border-color:#69ded2; color:#73f2df; background:#1d4549; }

.viewport { grid-column:2; grid-row:2; position:relative; min-width:0; overflow:hidden; }
.canvas-host, .canvas-host canvas { width:100%; height:100%; display:block; }
.viewport-vignette { pointer-events:none; position:absolute; inset:0; box-shadow:inset 0 0 100px rgba(3,10,18,.35); }
.drop-hint { position:absolute; left:50%; top:17px; transform:translate(-50%,-10px); padding:9px 14px; border-radius:20px; background:#173d43; border:1px solid #66eada; color:#80f3e4; font-size:11px; font-weight:800; opacity:0; transition:.2s; pointer-events:none; }
.drop-hint.visible { opacity:1; transform:translate(-50%,0); }
.runtime-panel { position:absolute; left:16px; bottom:16px; display:grid; grid-template-columns:repeat(2,minmax(95px,1fr)); gap:1px; border:1px solid var(--border); border-radius:13px; overflow:hidden; min-width:270px; opacity:0; pointer-events:none; transform:translateY(8px); transition:.2s; }
.test-mode-active .runtime-panel { opacity:1; transform:none; }
.runtime-panel div { padding:9px 11px; background:rgba(11,24,39,.82); }.runtime-panel span { display:block; color:var(--muted); font-size:8px; letter-spacing:.11em; }.runtime-panel strong { display:block; font-size:11px; margin-top:3px; }.runtime-gait { grid-column:span 2; }
.test-controls { position:absolute; right:14px; bottom:14px; display:none; flex-wrap:wrap; align-items:center; gap:9px; max-width:470px; padding:9px 10px; border:1px solid var(--border); border-radius:12px; font-size:9px; color:var(--muted); }
.test-controls.visible { display:flex; }.test-controls label { display:flex; align-items:center; gap:4px; }.test-controls button { border:1px solid var(--border); background:#1b3047; padding:6px 8px; border-radius:7px; font-size:9px; cursor:pointer; }
kbd { padding:2px 5px; border:1px solid #557189; background:#15273a; border-radius:4px; color:#dbeeff; font-size:9px; }

.right-panel { grid-column:3; grid-row:2; border-left:1px solid var(--border); padding:15px; overflow:auto; z-index:10; }
.right-panel section { border-bottom:1px solid rgba(145,180,210,.12); padding-bottom:14px; margin-bottom:14px; }
.creature-name-row label { display:block; }.creature-name-row input { width:100%; margin-top:5px; font-size:17px; font-weight:800; background:transparent; border:0; padding:3px 0; }
.section-heading { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.status-badge { font-size:9px; color:#ffb0b8; border:1px solid rgba(255,113,134,.35); background:rgba(104,32,49,.35); padding:4px 7px; border-radius:20px; }.status-badge.good { color:#83e7ab; border-color:rgba(115,220,145,.35); background:rgba(34,93,60,.35); }
.empty-state { text-align:center; padding:17px 8px; border:1px dashed rgba(143,180,209,.2); border-radius:12px; color:var(--muted); }.empty-state strong { display:block; color:#dceaff; font-size:12px; }.empty-state p { font-size:10px; line-height:1.5; }.empty-icon { font-size:25px; color:#69e1d2; margin-bottom:6px; }
.selection-title { display:flex; align-items:center; gap:9px; margin-bottom:12px; }.selection-title strong { display:block; font-size:13px; }.selection-title span { display:block; color:var(--muted); font-size:9px; margin-top:2px; text-transform:capitalize; }
.selection-orb { width:29px; height:29px; border-radius:10px; background:#68cf7b; box-shadow:inset 0 -5px 9px rgba(13,79,48,.3); }.selection-orb.limb { border-radius:16px 7px 16px 7px; }.selection-orb.accent { background:#ff9b67; }
.field { display:grid; gap:5px; margin:8px 0; font-size:9px; color:var(--muted); }.field select,.field input { width:100%; }
.field-group { margin:12px 0 7px; padding-top:8px; border-top:1px solid rgba(142,177,207,.11); }.field-group>span { font-size:9px; color:#b8cadb; font-weight:800; }
.range-field,.tuning-row { display:grid; grid-template-columns:68px 1fr 34px; align-items:center; gap:7px; margin:8px 0; font-size:9px; color:var(--muted); }.range-field input,.tuning-row input { width:100%; accent-color:#6fe5d3; }.range-field output,.tuning-row output { text-align:right; color:#dcecff; font-size:9px; }
.segment-card { margin:7px 0; padding:8px; background:rgba(12,25,40,.48); border-radius:9px; }.segment-header { display:flex; justify-content:space-between; font-size:9px; }.segment-header span { color:#67dfd2; }
.inference-note { display:flex; justify-content:space-between; padding:7px 8px; border-radius:8px; background:rgba(71,113,139,.13); font-size:9px; color:var(--muted); text-transform:capitalize; }.inference-note strong { color:#71e9da; }
.button-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:6px; margin-top:8px; }.button-grid.three { grid-template-columns:repeat(3,1fr); }.button-grid button,.full { border:1px solid var(--border); background:#1a3047; border-radius:8px; padding:8px 4px; font-size:9px; cursor:pointer; }.danger { color:#ff99a8!important; border-color:rgba(255,113,134,.25)!important; }.full { width:100%; }
.stats-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }.stat { background:rgba(9,21,35,.46); border:1px solid rgba(138,177,207,.1); border-radius:9px; padding:8px; }.stat span { display:block; color:var(--muted); font-size:8px; }.stat strong { display:block; font-size:10px; margin-top:3px; }.stat.wide { grid-column:span 2; }
.developer-panel { border:1px solid var(--border); border-radius:11px; background:rgba(9,20,33,.38); overflow:hidden; }.developer-panel summary { display:flex; justify-content:space-between; padding:10px; cursor:pointer; font-size:10px; font-weight:800; }.perf { display:flex; gap:6px; }.perf b { color:#71e8d9; font-size:8px; }.debug-columns { padding:0 10px 10px; }.debug-columns h3 { font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:.12em; margin:10px 0 6px; }.toggle-list { display:grid; grid-template-columns:1fr 1fr; gap:6px; }.toggle-list label { display:flex; align-items:center; gap:5px; color:#b6c7d7; font-size:8px; }.toggle-list input { accent-color:#67e0d1; }
.toast { position:fixed; left:50%; top:82px; transform:translate(-50%,-8px); opacity:0; z-index:100; padding:10px 14px; background:#17443f; border:1px solid #5ce0cf; border-radius:10px; color:#a7fff2; font-size:11px; font-weight:700; pointer-events:none; transition:.22s; }.toast.visible { opacity:1; transform:translate(-50%,0); }.toast.error { background:#512631; border-color:#ff7186; color:#ffd2d8; }

@media (max-width: 1180px) {
  .app-shell { grid-template-columns:240px minmax(360px,1fr) 285px; }
  .palette { padding:13px 10px; }.right-panel { padding:12px; }
  .top-actions .soft-button { display:none; }
}
.boot-screen { position:fixed; inset:0; z-index:1000; display:grid; place-content:center; justify-items:center; gap:8px; background:radial-gradient(circle,#29455f,#0e1828 70%); color:#eff9ff; }
.boot-mark { display:grid; place-items:center; width:62px; height:62px; border-radius:20px; background:linear-gradient(145deg,#71f1cf,#56a8ff); color:#102236; font-weight:900; font-size:22px; box-shadow:0 15px 45px rgba(81,211,207,.28); }
.boot-screen strong { margin-top:8px; }.boot-screen span { color:#91a9bf; font-size:11px; }
.palette-item.armed { border-color:#6ef0df; background:linear-gradient(135deg,rgba(34,91,91,.95),rgba(28,60,77,.95)); box-shadow:0 0 0 2px rgba(101,246,230,.08); }

// main.js

const ui = {
    // Wall
    wallW: document.getElementById('inpWallW'),
    wallH: document.getElementById('inpWallH'),
    wallAR: document.getElementById('valWallAR'),
    wallAR: document.getElementById('valWallAR'),

    // Proj Setup
    W: document.getElementById('inpW'),
    H: document.getElementById('inpH'),
    btnSwapRes: document.getElementById('btnSwapRes'),

    // X Axis
    TW: document.getElementById('inpTW'),
    P: document.getElementById('inpP'),
    Ox: document.getElementById('inpOx'),
    txtOxPct: document.getElementById('txtOxPct'),
    sliderOx: document.getElementById('sliderOx'),
    lblOxSlider: document.getElementById('lblOxSlider'),

    // Y Axis
    TH: document.getElementById('inpTH'),
    R: document.getElementById('inpR'),
    Oy: document.getElementById('inpOy'),
    txtOyPct: document.getElementById('txtOyPct'),
    sliderOy: document.getElementById('sliderOy'),
    lblOySlider: document.getElementById('lblOySlider'),

    // Status Badges
    badgeOxPct: document.getElementById('badgeOxPct'),
    badgeOyPct: document.getElementById('badgeOyPct'),

    // Axis Lock Radios
    axisLockRadios: document.getElementsByName('axisLock'),

    // Canvas Status
    canvasAR: document.getElementById('valCanvasAR'),
    msgStatus: document.getElementById('msgStatus'),
    hdrRes: document.getElementById('hdrRes'),

    // Decor
    chkCircles: document.getElementById('chkCircles'),
    chkGrid: document.getElementById('chkGrid'),
    chkProjInfo: document.getElementById('chkProjInfo'),
    chkColorGrid: document.getElementById('chkColorGrid'),
    inpGridThin: document.getElementById('inpGridThin'),
    inpGridThick: document.getElementById('inpGridThick'),

    exportBtn: document.getElementById('btnExport'),

    // Canvas & Mouse
    mainCanvas: document.getElementById('mainCanvas'),
    txtCursor: document.getElementById('txtCursor'),
    txtOutputRes: document.getElementById('txtOutputRes'),
    txtPxToMm: document.getElementById('txtPxToMm'),
    txtTrueW: document.getElementById('txtTrueW'),
    txtTrueH: document.getElementById('txtTrueH'),

    // Project Name & Export
    inpProjName: document.getElementById('inpProjName'),
    exportOptions: document.getElementsByName('exportFmt'),
    chkExportBlend: document.getElementById('chkExportBlend')
};

let engine, exporter;

function val(el) { return parseFloat(el.value) || 0; }
function setVal(el, v) { el.value = Math.round(v); }

function init() {
    engine = new CanvasEngine('mainCanvas');
    exporter = new Exporter(16384);

    // Default Init: 2x1 WUXGA (1920x1200)
    setVal(ui.W, 1920); setVal(ui.H, 1200);
    setVal(ui.P, 2); setVal(ui.R, 1);
    setVal(ui.Ox, 192); setVal(ui.Oy, 0);

    bindEvents();
    autoFitTargetAxis(); // Initial auto-fit
}

function updateWallAR() {
    let w = val(ui.wallW) || 1;
    let h = val(ui.wallH) || 1;
    let ar = (w / h).toFixed(3);
    ui.wallAR.textContent = ar + ':1';
    return (w / h);
}

function updateCanvasAR() {
    let tw = val(ui.txtTrueW) || val(ui.TW) || 1;
    let th = val(ui.txtTrueH) || val(ui.TH) || 1;

    // Safety fallback if True Resolution is not calculated yet
    if (isNaN(tw) || tw <= 0) tw = val(ui.TW);
    if (isNaN(th) || th <= 0) th = val(ui.TH);

    let ar = (tw / th).toFixed(3);
    if (ui.canvasAR) ui.canvasAR.textContent = ar + ':1';
    if (ui.hdrRes) ui.hdrRes.textContent = `${Math.round(tw)} x ${Math.round(th)}`;

    // Exact difference check
    let wallAR = updateWallAR();
    let diff = Math.abs((tw / th) - wallAR);
    if (diff < 0.05) {
        if (ui.msgStatus) ui.msgStatus.textContent = "Great Match: Canvas Aspect Ratio aligns closely with Wall.";
        if (ui.msgStatus) ui.msgStatus.className = "mt-1 text-[10px] text-cyan-400";
    } else {
        if (ui.msgStatus) ui.msgStatus.textContent = "Warning: Physical Aspect Ratio diverges significantly.";
        if (ui.msgStatus) ui.msgStatus.className = "mt-1 text-[10px] text-rose-400 font-medium";
    }
}

/* --- V3: Overlap Status Color & Badges --- */

function getOverlapColorStatus(pct) {
    // Return tailwind class prefix and hex color for canvas
    if (pct < 0.1000) return { classes: 'bg-red-500/20 text-red-500 border-red-500/50', hex: '#ef4444' };
    if (pct >= 0.1000 && pct <= 0.1500) return { classes: 'bg-orange-500/20 text-orange-400 border-orange-500/50', hex: '#f97316' };
    if (pct > 0.1500 && pct <= 0.3000) return { classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', hex: '#10b981' };
    if (pct > 0.3000 && pct <= 0.5000) return { classes: 'bg-orange-500/20 text-orange-400 border-orange-500/50', hex: '#f97316' };
    return { classes: 'bg-red-500/20 text-red-500 border-red-500/50', hex: '#ef4444' };
}

function updateBadgeStyle(badgeEl, pctVal) {
    let status = getOverlapColorStatus(pctVal);
    badgeEl.className = `px-2 py-0.5 rounded text-[10px] font-bold border ${status.classes}`;
    badgeEl.textContent = (pctVal * 100).toFixed(1) + '%';
    return status.hex; // Return canvas drawing color
}

let currentOverlapColors = { x: '#f97316', y: '#f97316' };

function updatePercents() {
    let w = val(ui.W) || 1;
    let h = val(ui.H) || 1;

    let oxPct = val(ui.Ox) / w;
    let oyPct = val(ui.Oy) / h;

    currentOverlapColors.x = updateBadgeStyle(ui.badgeOxPct, oxPct);
    currentOverlapColors.y = updateBadgeStyle(ui.badgeOyPct, oyPct);
}

function calcTotalX() {
    let w = val(ui.W), p = val(ui.P), ox = val(ui.Ox);
    if (p < 1) { setVal(ui.P, 1); p = 1; }
    if (p === 1) { ox = 0; setVal(ui.Ox, 0); }
    let tw = (w * p) - (ox * (p - 1));
    setVal(ui.TW, tw);
}

function calcOverlapX() {
    let w = val(ui.W), p = val(ui.P), tw = val(ui.TW);
    if (p < 1) { setVal(ui.P, 1); p = 1; }
    if (p === 1) { setVal(ui.Ox, 0); setVal(ui.TW, w); return; }

    // JS Math.round prevents decimal tearing in pixels
    let ox = Math.round((w * p - tw) / (p - 1));

    // Prevent negative overlap or > 100% physically
    if (ox < 0) ox = 0;
    if (ox > w) ox = w;
    setVal(ui.Ox, ox);
    // We must re-eval total width because we bounded overlap
    calcTotalX();
}

function calcTotalY() {
    let h = val(ui.H), r = val(ui.R), oy = val(ui.Oy);
    if (r < 1) { setVal(ui.R, 1); r = 1; }
    if (r === 1) { oy = 0; setVal(ui.Oy, 0); }
    let th = (h * r) - (oy * (r - 1));
    setVal(ui.TH, th);
}

function calcOverlapY() {
    let h = val(ui.H), r = val(ui.R), th = val(ui.TH);
    if (r < 1) { setVal(ui.R, 1); r = 1; }
    if (r === 1) { setVal(ui.Oy, 0); setVal(ui.TH, h); return; }

    // JS Math.round prevents decimal tearing
    let oy = Math.round((h * r - th) / (r - 1));

    if (oy < 0) oy = 0;
    if (oy > h) oy = h;
    setVal(ui.Oy, oy);
    calcTotalY();
}

function recalcAll() {
    let tw = val(ui.TW), th = val(ui.TH);
    let ar = tw / th;
    ui.canvasAR.innerText = isNaN(ar) ? "0.00" : ar.toFixed(2);
    ui.hdrRes.innerText = `${tw} x ${th}`;

    updatePercents();

    // Calculate Physical Scale (mm per pixel)
    let wallW = val(ui.wallW);
    let wallH = val(ui.wallH);
    let lockedAxis = getLockedAxis();
    let pxToMm = 0;

    // Calculate based on the dominant mapping axis
    if (lockedAxis === 'X' || lockedAxis === 'Auto') {
        pxToMm = tw > 0 ? (wallW / tw) : 0;
    } else {
        pxToMm = th > 0 ? (wallH / th) : 0;
    }

    if (ui.txtOutputRes) ui.txtOutputRes.innerText = `${tw} x ${th}`;
    if (ui.txtPxToMm) ui.txtPxToMm.innerText = isNaN(pxToMm) ? "0.00" : pxToMm.toFixed(2);

    // Calculate True Wall Resolution
    let trueW = tw;
    let trueH = th;
    if (wallW > 0 && wallH > 0) {
        if (lockedAxis === 'X' || lockedAxis === 'Auto') {
            trueW = tw;
            trueH = Math.round(tw * (wallH / wallW));
        } else if (lockedAxis === 'Y') {
            trueH = th;
            trueW = Math.round(th * (wallW / wallH));
        }
    }

    if (ui.txtTrueW) ui.txtTrueW.innerText = isNaN(trueW) ? "--" : trueW;
    if (ui.txtTrueH) ui.txtTrueH.innerText = isNaN(trueH) ? "--" : trueH;

    let isShortage = (tw < trueW || th < trueH);

    // Apply missing area warning colors
    if (isShortage) {
        ui.TW.classList.remove('text-slate-300', 'text-cyan-300');
        ui.TH.classList.remove('text-slate-300', 'text-cyan-300');
        ui.TW.classList.add('text-rose-500');
        ui.TH.classList.add('text-rose-500');
    } else {
        ui.TW.classList.remove('text-rose-500', 'text-cyan-300');
        ui.TH.classList.remove('text-rose-500', 'text-cyan-300');
        ui.TW.classList.add('text-slate-300');
        ui.TH.classList.add('text-slate-300');
    }

    engine.render({
        TW: tw, TH: th,
        TrueW: trueW, TrueH: trueH,
        W: val(ui.W), H: val(ui.H),
        P: val(ui.P), R: val(ui.R),
        Ox: val(ui.Ox), Oy: val(ui.Oy),
        projName: ui.inpProjName ? ui.inpProjName.value : "Akee_Y",
        drawCircles: ui.chkCircles.checked,
        drawGrid: ui.chkGrid.checked,
        drawProjInfo: ui.chkProjInfo ? ui.chkProjInfo.checked : true,
        drawColorGrid: ui.chkColorGrid ? ui.chkColorGrid.checked : false,
        gridThin: val(ui.inpGridThin),
        gridThick: val(ui.inpGridThick),
        drawBlend: ui.chkExportBlend ? ui.chkExportBlend.checked : true,
        colorX: currentOverlapColors.x,
        colorY: currentOverlapColors.y,
        WallW: wallW,
        WallH: wallH,
        LockedAxis: lockedAxis
    });

    // Sync Sliders
    ui.sliderOx.max = Math.round(val(ui.W));
    ui.sliderOy.max = Math.round(val(ui.H));
    ui.sliderOx.value = Math.round(val(ui.Ox));
    ui.sliderOy.value = Math.round(val(ui.Oy));
    ui.lblOxSlider.textContent = Math.round(val(ui.Ox)) + ' px';
    ui.lblOySlider.textContent = Math.round(val(ui.Oy)) + ' px';
}

function bindEvents() {
    // Explicit Bidirectional Correlation logic:

    // Viewport Options
    [ui.chkCircles, ui.chkGrid, ui.chkProjInfo, ui.chkColorGrid, ui.chkExportBlend].forEach(el => {
        if (el) el.addEventListener('change', recalcAll);
    });
    [ui.inpGridThin, ui.inpGridThick, ui.inpProjName].forEach(el => {
        if (el) el.addEventListener('input', recalcAll);
    });

    // Always-on Auto-Fit Triggers
    // Wall and Proj dims force auto-fit
    [ui.wallW, ui.wallH, ui.W, ui.H].forEach(el => el.addEventListener('input', autoFitTargetAxis));

    // Axis Radios force re-evaluation
    ui.axisLockRadios.forEach(r => r.addEventListener('change', autoFitTargetAxis));

    // Lock values (P or R) force re-evaluation
    ui.P.addEventListener('input', () => { if (getLockedAxis() === 'X') autoFitTargetAxis(); else { calcTotalX(); recalcAll(); } });
    ui.R.addEventListener('input', () => { if (getLockedAxis() === 'Y') autoFitTargetAxis(); else { calcTotalY(); recalcAll(); } });

    // Projector Swap Resolution
    ui.btnSwapRes.addEventListener('click', () => {
        let temp = val(ui.W);
        setVal(ui.W, val(ui.H));
        setVal(ui.H, temp);

        // Add a small rotation animation to the icon
        ui.btnSwapRes.querySelector('svg').style.transform = 'rotate(180deg)';
        ui.btnSwapRes.querySelector('svg').style.transition = 'transform 0.3s ease';
        setTimeout(() => {
            ui.btnSwapRes.querySelector('svg').style.transition = 'none';
            ui.btnSwapRes.querySelector('svg').style.transform = 'rotate(0deg)';
        }, 300);

        autoFitTargetAxis();
    });

    // User dragging sliders modifies overlap directly, overrides Auto temporarily
    ui.sliderOx.addEventListener('input', (e) => { setVal(ui.Ox, e.target.value); calcTotalX(); recalcAll(); });
    ui.sliderOy.addEventListener('input', (e) => { setVal(ui.Oy, e.target.value); calcTotalY(); recalcAll(); });

    // Total Width/Height direct inputs
    ui.TW.addEventListener('input', () => { calcOverlapX(); recalcAll(); });
    ui.TH.addEventListener('input', () => { calcOverlapY(); recalcAll(); });

    // Cursor tracking
    ui.mainCanvas.addEventListener('mousemove', (e) => {
        let cw = ui.mainCanvas.width;
        let ch = ui.mainCanvas.height;
        let clientW = ui.mainCanvas.clientWidth;
        let clientH = ui.mainCanvas.clientHeight;

        // Exact coordinate mapping factoring in object-contain
        let cx = Math.round((e.offsetX / clientW) * cw);
        let cy = Math.round((e.offsetY / clientH) * ch);
        ui.txtCursor.textContent = `${cx}, ${cy}`;
    });
    ui.mainCanvas.addEventListener('mouseleave', () => { ui.txtCursor.textContent = `0, 0`; });

    // Auto-Recommend Button removed -> Replaced by continuous autoFitTargetAxis
    // Export Image
    ui.exportBtn.addEventListener('click', () => {
        let fmt = 'true';
        if (ui.exportOptions) {
            for (let r of ui.exportOptions) {
                if (r.checked) fmt = r.value;
            }
        }

        let tw = val(ui.TW);
        let th = val(ui.TH);
        let exportW = tw;
        let exportH = th;

        if (fmt === 'true') {
            exportW = parseInt(ui.txtTrueW.innerText) || tw;
            exportH = parseInt(ui.txtTrueH.innerText) || th;
        }

        exporter.exportImage(ui.mainCanvas, exportW, exportH);
    });
}

function getLockedAxis() {
    for (let r of ui.axisLockRadios) {
        if (r.checked) return r.value;
    }
    return 'X';
}

function autoFitTargetAxis() {
    let Wall_W = val(ui.wallW) || 10000;
    let Wall_H = val(ui.wallH) || 3000;
    let AR = Wall_W / Wall_H;

    let w = val(ui.W) || 1920;
    let h = val(ui.H) || 1200;

    let lockedAxis = getLockedAxis();

    let bestDist = Infinity;
    let bestConfig = null;

    let pIter = lockedAxis === 'X' ? [Math.max(1, val(ui.P))] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let rIter = lockedAxis === 'Y' ? [Math.max(1, val(ui.R))] : [1, 2, 3, 4, 5, 6, 7, 8];

    // Brute force optimal setup for the NON-locked axis
    for (let p of pIter) {
        for (let r of rIter) {

            // Loop overlap for unlocked axis, keep locked axis overlap relatively sane
            for (let ox_pct = 0.05; ox_pct <= 0.35; ox_pct += 0.01) {
                // Use imported Calculator module to enforce strict 1:1 Pixel Mathematics
                let sysX = Calculator.calculateSystem(Wall_W, Wall_H, w, h, p, r, ox_pct * 100);

                let ox = sysX.pixelOverlapX;
                if (p === 1) ox = 0;

                let tw = w * p - ox * (p - 1);
                let th_target = tw / AR;

                let oy = 0;
                if (r > 1) {
                    oy = Math.round((h * r - th_target) / (r - 1));
                }

                let oy_pct = oy / h;

                if (r === 1 || (oy_pct >= 0.0 && oy_pct <= 0.50)) {
                    let th = h * r - oy * (r - 1);
                    let actualAR = tw / th;
                    let ar_error = Math.abs(actualAR - AR);

                    // We strongly weight hitting the 'Green' zone (15~25%) overlapping.
                    // This forces the auto-fit to prioritize overlap BEFORE finding the exact Aspect Ratio.
                    let penalty = 0;
                    if (ox_pct < 0.15 || ox_pct > 0.25) penalty += 20000;
                    if (oy_pct < 0.15 || oy_pct > 0.25) penalty += 20000;
                    if (p === 1) penalty = 0; // single col is fine
                    if (r === 1) penalty = (ox_pct < 0.15 || ox_pct > 0.25) ? 20000 : 0;

                    let cost = penalty + (ar_error * 1000) + Math.abs(ox_pct - oy_pct) * 10;

                    if (cost < bestDist) {
                        bestDist = cost;
                        bestConfig = { p, r, ox, oy, tw, th };
                    }
                }
            }
        }
    }

    if (bestConfig) {
        if (lockedAxis !== 'X') setVal(ui.P, bestConfig.p);
        if (lockedAxis !== 'Y') setVal(ui.R, bestConfig.r);
        setVal(ui.Ox, bestConfig.ox);
        setVal(ui.Oy, bestConfig.oy);
        calcTotalX(); // Re-sync math exactly
        calcTotalY();
        recalcAll();
    }
}

document.addEventListener('DOMContentLoaded', init);

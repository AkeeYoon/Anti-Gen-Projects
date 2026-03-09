// canvasEngine.js (V2 Lumina Edition & V5 Test Pattern)

class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });
    }

    render(data) {
        const { TW, TH, W, H, P, R, Ox, Oy, drawCircles, drawGrid, drawBlend, colorX, colorY, WallW, WallH, LockedAxis, TrueW, TrueH } = data;

        const canvasW = Math.max(TW, TrueW || TW);
        const canvasH = Math.max(TH, TrueH || TH);

        this.canvas.width = canvasW;
        this.canvas.height = canvasH;

        const ctx = this.ctx;

        // Base background for Missing Area (Shortage)
        ctx.fillStyle = '#0a0303';
        ctx.fillRect(0, 0, canvasW, canvasH);

        const offsetX = (canvasW - TW) / 2;
        const offsetY = (canvasH - TH) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        // 1. Background (Dark Slate) for actual projector output
        ctx.fillStyle = '#050a10';
        ctx.fillRect(0, 0, TW, TH);

        const trueW = TrueW || TW;
        const trueH = TrueH || TH;

        // 2. Square Grid (LUMINA style)
        if (drawGrid) {
            const gridSize = 100; // Fixed physical equivalent scale per square
            const gThick = (data.gridThick !== undefined && !isNaN(data.gridThick)) ? data.gridThick : 2;
            const gThin = (data.gridThin !== undefined && !isNaN(data.gridThin)) ? data.gridThin : 1;

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 15px 'JetBrains Mono', monospace";

            const cx = TW / 2;
            const cy = TH / 2;

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, TW, TH);
            ctx.clip();

            // Draw Grid Lines or Color Cells
            // Base calculation limits
            const stepsXLimit = Math.ceil(TW / gridSize / 2);
            const stepsYLimit = Math.ceil(TH / gridSize / 2);

            ctx.font = "bold 40px 'Inter', sans-serif";

            for (let i = -stepsXLimit; i <= stepsXLimit; i++) {
                for (let j = -stepsYLimit; j <= stepsYLimit; j++) {
                    const cellX = cx + (i * gridSize);
                    const cellY = cy + (j * gridSize);

                    // Proceed only if cell is inside the visible area
                    if (cellX + gridSize >= 0 && cellX <= TW && cellY + gridSize >= 0 && cellY <= TH) {

                        // 2-1. Draw Color Grid Mode
                        if (data.drawColorGrid) {
                            // Transform i, j into a repeating 0-15 (16 steps) pattern
                            // User reference shows a repeating 16x16 tile pattern
                            // First, make coordinates strictly positive and continuous
                            const normX = (i % 16 + 16) % 16;
                            const normY = (j % 16 + 16) % 16;

                            // Color shifts diagonally. 0 = Red
                            const colorIndex = (normX + normY) % 16;
                            const hue = colorIndex * 22.5;
                            const saturation = 90; // Slightly less vivid
                            const lightness = 45; // A bit darker / heavier

                            ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                            ctx.fillRect(cellX, cellY, gridSize, gridSize);

                            // Draw Hex Code-like coordinate identifier
                            ctx.fillStyle = 'rgba(0,0,0,1)';
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";

                            // Draw text that matches the color index (0-F)
                            const valText = colorIndex.toString(16).toUpperCase();

                            ctx.fillText(valText, cellX + gridSize / 2, cellY + gridSize / 2);
                        } else {
                            // Only draw lines if color grid is not active (or base background handles it)
                        }
                    }
                }
            }

            // Return to normal grid lines font
            ctx.font = "bold 15px 'JetBrains Mono', monospace";

            // Vertical lines (X axis)
            for (let i = 0; cx + i * gridSize <= TW || cx - i * gridSize >= 0; i++) {
                const isThick = (i % 5 === 0);

                if (data.drawColorGrid) {
                    ctx.strokeStyle = isThick ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.3)'; // Black/Dark grid for Color Mode
                } else {
                    ctx.strokeStyle = isThick ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.15)'; // Reddish grid
                }
                ctx.lineWidth = isThick ? gThick : gThin;

                // +X
                if (cx + i * gridSize <= TW) {
                    let rx = cx + i * gridSize;
                    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, TH); ctx.stroke();
                    if (isThick && i !== 0 && !data.drawColorGrid) { // Mask text in Color Mode
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                        ctx.fillText(i, rx, 25);
                        ctx.fillText(i, rx, TH - 25);
                    }
                }
                // -X
                if (i !== 0 && cx - i * gridSize >= 0) {
                    let lx = cx - i * gridSize;
                    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, TH); ctx.stroke();
                    if (isThick && !data.drawColorGrid) { // Mask text in Color Mode
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                        ctx.fillText(-i, lx, 25);
                        ctx.fillText(-i, lx, TH - 25);
                    }
                }
            }

            // Horizontal lines (Y axis)
            for (let i = 0; cy + i * gridSize <= TH || cy - i * gridSize >= 0; i++) {
                const isThick = (i % 5 === 0);

                if (data.drawColorGrid) {
                    ctx.strokeStyle = isThick ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.3)'; // Black/Dark grid
                } else {
                    ctx.strokeStyle = isThick ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.15)';
                }
                ctx.lineWidth = isThick ? gThick : gThin;

                // +Y
                if (cy + i * gridSize <= TH) {
                    let by = cy + i * gridSize;
                    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(TW, by); ctx.stroke();
                    if (isThick && i !== 0 && !data.drawColorGrid) { // Mask text in Color Mode
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                        const char = String.fromCharCode(97 + (i / 5 - 1));
                        ctx.fillText(char, 25, by);
                        ctx.fillText(char, TW - 25, by);
                    }
                }
                // -Y
                if (i !== 0 && cy - i * gridSize >= 0) {
                    let ty = cy - i * gridSize;
                    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(TW, ty); ctx.stroke();
                    if (isThick && !data.drawColorGrid) { // Mask text in Color Mode
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                        const char = String.fromCharCode(65 + (i / 5 - 1));
                        ctx.fillText(char, 25, ty);
                        ctx.fillText(char, TW - 25, ty);
                    }
                }
            }

            // True Wall Boundary (Green Line) Edge
            const sx = (TW - trueW) / 2;
            const sy = (TH - trueH) / 2;

            ctx.strokeStyle = 'rgba(34, 197, 94, 0.9)'; // Bright Green
            ctx.lineWidth = 4;
            ctx.strokeRect(sx, sy, trueW, trueH);

            ctx.restore();
        }

        // 3. Global Test Pattern (Alignment Circles fitted to True Height)
        if (drawCircles) {
            const radius = Math.min(trueW, trueH) / 2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;

            const cx = TW / 2;
            const cy = TH / 2;

            ctx.beginPath();
            if (trueW >= trueH) {
                // Tile horizontally from center outwards (tangent circles)
                const numSteps = Math.ceil((trueW / 2) / (radius * 2)) + 1; // circles to each side
                for (let i = -numSteps; i <= numSteps; i++) {
                    const circleX = cx + (i * radius * 2);
                    ctx.moveTo(circleX + radius, cy);
                    ctx.arc(circleX, cy, radius, 0, Math.PI * 2);
                }
            } else {
                // Tile vertically from center outwards
                const numSteps = Math.ceil((trueH / 2) / (radius * 2)) + 1;
                for (let i = -numSteps; i <= numSteps; i++) {
                    const circleY = cy + (i * radius * 2);
                    ctx.moveTo(cx + radius, circleY);
                    ctx.arc(cx, circleY, radius, 0, Math.PI * 2);
                }
            }
            ctx.stroke();

            // Center crosshair (Red, crossing the entire true wall)
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // Red
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo((TW - trueW) / 2, cy); ctx.lineTo((TW + trueW) / 2, cy);
            ctx.moveTo(cx, (TH - trueH) / 2); ctx.lineTo(cx, (TH + trueH) / 2);
            ctx.stroke();
        }

        // 3. Projector Bounds and VIOSO Extent Circles
        ctx.lineWidth = 2;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Let's iterate over Grid
        for (let r = 0; r < R; r++) {
            for (let p = 0; p < P; p++) {
                // Top-Left of this Projector inside the Total Canvas
                const sx = p * (W - Ox);
                const sy = r * (H - Oy);

                // Base Frame Outline (Test Pattern Edge)
                if (drawBlend) {
                    ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)'; // Cyan semi-transparent for outline
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(sx, sy, W, H);
                }

                // Blend/Overlap Zones Tint (Right Edge - X Axis)
                if (drawBlend && p < P - 1 && Ox > 0) {
                    ctx.fillStyle = hexToRgba(colorX || '#f97316', 0.15); // Dynamic Color based on %
                    ctx.fillRect(sx + W - Ox, sy, Ox, H);
                }

                // Blend/Overlap Zones Tint (Bottom Edge - Y Axis)
                if (drawBlend && r < R - 1 && Oy > 0) {
                    ctx.fillStyle = hexToRgba(colorY || '#f97316', 0.15); // Dynamic Color based on %
                    ctx.fillRect(sx, sy + H - Oy, W, Oy);
                }

                // Corner Overlap (Both X and Y)
                if (drawBlend && p < P - 1 && r < R - 1 && Ox > 0 && Oy > 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Highlight grid intersections slightly
                    ctx.fillRect(sx + W - Ox, sy + H - Oy, Ox, Oy);
                }

                // Center calculations
                const cx = sx + (W / 2);
                const cy = sy + (H / 2);

                // Crosshair at physical center (Always drawn for lens alignment)
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
                ctx.lineWidth = 2;
                ctx.moveTo(cx - 30, cy); ctx.lineTo(cx + 30, cy);
                ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy + 30);
                ctx.stroke();

                // Node Identifier (Test Pattern Label)
                if (data.drawProjInfo) {
                    const sF = Math.max(0.5, Math.min(W, H) / 1000); // Dynamic scale factor based on projector resolution
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.font = `bold ${Math.round(80 * sF)}px 'Courier New', Courier, monospace`;
                    // Place Projector Info BELOW the center line
                    ctx.fillText(`P${p + 1} R${r + 1}`, cx, cy + (60 * sF));

                    ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
                    ctx.font = `${Math.round(30 * sF)}px 'Courier New'`;
                    ctx.fillText(`Res: ${W}x${H} | Offset: ${sx},${sy}`, cx, cy + (120 * sF));
                }
            }
        }

        // 5. Center Main Info / Title Rendering
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const ar = (trueW / trueH).toFixed(2);
        const sqW = (trueW / 100).toFixed(1);
        const sqH = (trueH / 100).toFixed(1);

        ctx.fillStyle = 'rgba(255, 255, 255, 1)';

        // Base scale for center text based on true wall size
        const tScale = Math.max(0.7, Math.min(trueW, trueH) / 1500);

        // --- UPPER SECTION: Logo & Environment Data ---
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10 * tScale;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(130 * tScale)}px 'Inter', sans-serif`;
        ctx.fillText(data.projName || "Akee_Y", TW / 2, TH / 2 - (320 * tScale));

        ctx.shadowBlur = 0; // Reset shadow for clean info text

        // Resolution
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `bold ${Math.round(60 * tScale)}px 'Inter', sans-serif`;
        ctx.fillText(`${trueW}px x ${trueH}px`, TW / 2, TH / 2 - (170 * tScale));

        // AR
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = `bold ${Math.round(45 * tScale)}px 'Inter', sans-serif`;
        ctx.fillText(`AR ${ar}:1`, TW / 2, TH / 2 - (100 * tScale));

        // Squares
        ctx.font = `bold ${Math.round(45 * tScale)}px 'Inter', sans-serif`;
        ctx.fillText(`Grid[100]: ${sqW} x ${sqH} full squares`, TW / 2, TH / 2 - (40 * tScale));

        ctx.shadowBlur = 0;

        // Corner indicators
        ctx.textAlign = "left";
        ctx.font = "20px Arial";
        ctx.fillStyle = 'rgba(34, 211, 238, 0.4)';
        ctx.fillText("0,0", 20, 30);
        ctx.textAlign = "right";
        ctx.fillText(`${TW},${TH}`, TW - 20, TH - 20);

        // 5. Overflow Mask (Physical Wall Projection Area)
        const wallW = data.WallW || 0;
        const wallH = data.WallH || 0;
        const lockedAxis = data.LockedAxis || 'Auto';

        if (wallW > 0 && wallH > 0) {
            // Calculate Wall Mapping Resolution
            let mappedW = TW;
            let mappedH = TH;

            // Determines which axis perfectly fits and which overflows
            // E.g., if X is locked, the width is perfect, but height might overflow
            if (lockedAxis === 'X' || lockedAxis === 'Auto') {
                mappedW = TW;
                mappedH = TW * (wallH / wallW);
            } else if (lockedAxis === 'Y') {
                mappedH = TH;
                mappedW = TH * (wallW / wallH);
            }

            // Draw Overflow Mask
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'; // Darkened area for overflow

            // Top/Bottom Overflow or Shortage
            if (mappedH < TH) {
                const overflowH = (TH - mappedH) / 2;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.fillRect(0, 0, TW, overflowH);
                ctx.fillRect(0, TH - overflowH, TW, overflowH);

                ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                ctx.beginPath();
                ctx.moveTo(0, overflowH); ctx.lineTo(TW, overflowH);
                ctx.moveTo(0, TH - overflowH); ctx.lineTo(TW, TH - overflowH);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.textAlign = "center";
                ctx.font = "bold 30px 'Courier New'";
                ctx.fillText("OVERFLOW / WASTED PIXELS", TW / 2, overflowH / 2);
                ctx.fillText("OVERFLOW / WASTED PIXELS", TW / 2, TH - (overflowH / 2));
            } else if (TrueH > TH) {
                // Shortage (Missing Area)
                const missingH = (TrueH - TH) / 2;
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Red tint for missing area
                ctx.fillRect(0, -missingH, TW, missingH);
                ctx.fillRect(0, TH, TW, missingH);

                ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(TW, 0);
                ctx.moveTo(0, TH); ctx.lineTo(TW, TH);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.textAlign = "center";
                ctx.font = "bold 30px 'Courier New'";
                ctx.fillText("MISSING AREA", TW / 2, -missingH / 2);
                ctx.fillText("MISSING AREA", TW / 2, TH + (missingH / 2));
            }

            // Left/Right Overflow or Shortage
            if (mappedW < TW) {
                const overflowW = (TW - mappedW) / 2;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.fillRect(0, 0, overflowW, TH);
                ctx.fillRect(TW - overflowW, 0, overflowW, TH);

                ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                ctx.beginPath();
                ctx.moveTo(overflowW, 0); ctx.lineTo(overflowW, TH);
                ctx.moveTo(TW - overflowW, 0); ctx.lineTo(TW - overflowW, TH);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.save();
                ctx.translate(overflowW / 2, TH / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.textAlign = "center";
                ctx.font = "bold 30px 'Courier New'";
                ctx.fillText("OVERFLOW / WASTED PIXELS", 0, 0);
                ctx.restore();

                ctx.save();
                ctx.translate(TW - overflowW / 2, TH / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.textAlign = "center";
                ctx.font = "bold 30px 'Courier New'";
                ctx.fillText("OVERFLOW / WASTED PIXELS", 0, 0);
                ctx.restore();
            } else if (TrueW > TW) {
                // Shortage (Missing Area)
                const missingW = (TrueW - TW) / 2;
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Red tint for missing area
                ctx.fillRect(-missingW, 0, missingW, TH);
                ctx.fillRect(TW, 0, missingW, TH);

                ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.lineWidth = 4;
                ctx.setLineDash([15, 10]);
                ctx.beginPath();
                ctx.moveTo(0, 0); ctx.lineTo(0, TH);
                ctx.moveTo(TW, 0); ctx.lineTo(TW, TH);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.save();
                ctx.translate(-missingW / 2, TH / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.textAlign = "center";
                ctx.font = "bold 30px 'Courier New'";
                ctx.fillText("MISSING AREA", 0, 0);
                ctx.restore();

                ctx.save();
                ctx.translate(TW + missingW / 2, TH / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
                ctx.textAlign = "center";
                ctx.font = "bold 30px 'Courier New'";
                ctx.fillText("MISSING AREA", 0, 0);
                ctx.restore();
            }
        }

        ctx.restore(); // Restore translation
    }
}

// Helper to convert hex to rgba
function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

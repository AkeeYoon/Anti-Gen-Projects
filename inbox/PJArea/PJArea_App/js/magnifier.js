/**
 * Magnifier Tool
 * Enables pixel-to-pixel (1:1) zooming on canvas hover
 */
export class Magnifier {
    constructor(sourceCanvasId, magCanvasId, tooltipId) {
        this.sourceCanvas = document.getElementById(sourceCanvasId);
        this.magCanvas = document.getElementById(magCanvasId);
        this.magCtx = this.magCanvas.getContext('2d');
        this.tooltip = document.getElementById(tooltipId);
        this.zoomLevel = 2; // Fixed zoom level to see pixels

        this.bindEvents();
    }

    bindEvents() {
        this.sourceCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.sourceCanvas.addEventListener('mouseenter', () => {
            this.tooltip.classList.remove('hidden');
        });
        this.sourceCanvas.addEventListener('mouseleave', () => {
            this.tooltip.classList.add('hidden');
        });
    }

    handleMouseMove(e) {
        // Calculate precise intrinsic coordinates from scaled visual layout
        const rect = this.sourceCanvas.getBoundingClientRect();
        const scaleX = this.sourceCanvas.width / rect.width;
        const scaleY = this.sourceCanvas.height / rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Visual position for tooltip
        const offsetX = 15;
        const offsetY = 15;
        this.tooltip.style.left = `${e.clientX + offsetX}px`;
        this.tooltip.style.top = `${e.clientY + offsetY}px`;

        // The exact pixel on the real canvas
        const realX = Math.round(mouseX * scaleX);
        const realY = Math.round(mouseY * scaleY);

        this.updateMagnifier(realX, realY);
    }

    updateMagnifier(x, y) {
        // Clear previous
        this.magCtx.fillStyle = 'black';
        this.magCtx.fillRect(0, 0, this.magCanvas.width, this.magCanvas.height);

        // Turn off smoothing for pixelation block view
        this.magCtx.imageSmoothingEnabled = false;

        // We want to capture a segment of source canvas centered around (x,y)
        const size = this.magCanvas.width / this.zoomLevel;
        const srcX = x - (size / 2);
        const srcY = y - (size / 2);

        this.magCtx.drawImage(
            this.sourceCanvas,
            srcX, srcY, size, size, // Source rect
            0, 0, this.magCanvas.width, this.magCanvas.height // Dest rect
        );
    }
}

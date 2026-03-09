/**
 * Exporter Module
 * Handles canvas to image conversion with safety fallback for large resolutions
 */
class Exporter {
    constructor(maxCanvasDimension) {
        // e.g., Browsers generally limit canvas to ~16k or ~32k max Dimension 
        // We'll safely cap to prevent OOM
        this.maxCanvasDim = maxCanvasDimension || 16384;
    }

    /**
     * Attempts to export the original high-resolution canvas.
     * If total size > safe limit, implements fallback.
     */
    async exportImage(sourceCanvas, cropW, cropH, format = 'image/png', quality = 1.0) {

        let exportCanvas = sourceCanvas;

        // If crop bounds differ from source canvas bounds, we crop it out of the center
        if (cropW && cropH && (cropW !== sourceCanvas.width || cropH !== sourceCanvas.height)) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = cropW;
            tempCanvas.height = cropH;
            const ctx = tempCanvas.getContext('2d');

            // sourceCanvas has the full drawing. Center it.
            const cx = (sourceCanvas.width - cropW) / 2;
            const cy = (sourceCanvas.height - cropH) / 2;
            ctx.drawImage(sourceCanvas, cx, cy, cropW, cropH, 0, 0, cropW, cropH);
            exportCanvas = tempCanvas;
        }

        let targetWidth = exportCanvas.width;
        let targetHeight = exportCanvas.height;

        // Check dimension limits for Fallback execution
        if (targetWidth > this.maxCanvasDim || targetHeight > this.maxCanvasDim) {
            console.warn(`Export exceeds safe limits (${this.maxCanvasDim}px). Triggering fallback...`);
            exportCanvas = this.getFallbackCanvas(exportCanvas, targetWidth, targetHeight);

            // Switch to JPEG for extremely large fallbacks to save RAM/Disk
            format = 'image/jpeg';
            quality = 0.8;
            alert(`Note: Resolution exceeded safe limits. Auto-scaled down retaining original aspect ratio, saved as JPEG.`);
        }

        // Trigger Download
        try {
            const dataUrl = exportCanvas.toDataURL(format, quality);
            this.downloadURI(dataUrl, `mapping_pattern_${targetWidth}x${targetHeight}.png`);
        } catch (e) {
            console.error("Export failed, likely memory limit:", e);
            alert("Export Failed: Browser memory limit exceeded. Try reducing grid rows/cols.");
        }
    }

    getFallbackCanvas(sourceCanvas, w, h) {
        // Find safe scale ratio
        const scale = Math.min(this.maxCanvasDim / w, this.maxCanvasDim / h);
        const newW = Math.floor(w * scale);
        const newH = Math.floor(h * scale);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newW;
        tempCanvas.height = newH;

        const tempCtx = tempCanvas.getContext('2d');
        // We use image smoothing to make the scaled version look uniform
        tempCtx.imageSmoothingEnabled = true;

        tempCtx.drawImage(sourceCanvas, 0, 0, newW, newH);
        return tempCanvas;
    }

    downloadURI(uri, name) {
        const link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

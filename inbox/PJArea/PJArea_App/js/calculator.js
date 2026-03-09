/**
 * Calculator Module
 * Handles mathematical conversions and resolution mapping
 */

class Calculator {
    /**
     * Calculate total pixels mapping based on physical dimensions, 
     * projector layout, resolution, and overlap.
     * 
     * Applies robust integer rounding to prevent tearing/Moiré.
     */
    static calculateSystem(wallWidth, wallHeight, projWidth, projHeight, cols, rows, overlapPercent) {
        // Validation
        if (cols < 1) cols = 1;
        if (rows < 1) rows = 1;

        // Overlap ratio (0 to 1)
        const overlapTarget = overlapPercent / 100;

        // X Axis Calculation
        // How many overlapping zones?
        const overlapZonesX = cols - 1;
        // pixelOverlap is exact integer of projector width
        const pixelOverlapX = Math.round(projWidth * overlapTarget);
        // Total Resolution Width = (ProjWidth * cols) - (Overlap * OverlapZones)
        const totalResWidth = (projWidth * cols) - (pixelOverlapX * overlapZonesX);

        // Y Axis Calculation
        const overlapZonesY = rows - 1;
        const pixelOverlapY = Math.round(projHeight * overlapTarget);
        const totalResHeight = (projHeight * rows) - (pixelOverlapY * overlapZonesY);

        // Physical per pixel (mm per pixel ratio, based on X mostly, but can calculate mapping)
        const mmPerPixelX = wallWidth / totalResWidth;
        const mmPerPixelY = wallHeight / totalResHeight;

        return {
            totalResWidth,
            totalResHeight,
            pixelOverlapX,
            pixelOverlapY,
            overlapZonesX,
            overlapZonesY,
            mmPerPixelX,
            mmPerPixelY
        };
    }
}

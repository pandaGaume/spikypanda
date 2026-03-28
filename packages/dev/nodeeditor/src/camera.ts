export class Camera {
    x = 0;
    y = 0;
    scale = 1;

    private readonly minScale = 0.1;
    private readonly maxScale = 5;
    private readonly zoomFactor = 1.1;

    apply(viewport: HTMLElement): void {
        viewport.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
    }

    zoom(delta: number, mouseX: number, mouseY: number): void {
        const prevScale = this.scale;
        const factor = delta < 0 ? this.zoomFactor : 1 / this.zoomFactor;
        this.scale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));

        this.x = mouseX - (mouseX - this.x) * (this.scale / prevScale);
        this.y = mouseY - (mouseY - this.y) * (this.scale / prevScale);
    }

    pan(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
    }

    screenToWorld(sx: number, sy: number): { x: number; y: number } {
        return {
            x: (sx - this.x) / this.scale,
            y: (sy - this.y) / this.scale,
        };
    }
}

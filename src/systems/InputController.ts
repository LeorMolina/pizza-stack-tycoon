export class InputController {
    private keys = new Set<string>();
    private moveVector = { x: 0, z: 0 };
    private joystickActive = false;
    private startPos = { x: 0, y: 0 };
    private readonly maxRadius = 48;

    constructor(canvas: HTMLCanvasElement) {
        window.addEventListener("keydown", (e) => this.keys.add(e.key.toLowerCase()));
        window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));

        canvas.addEventListener("pointerdown", (e) => {
            this.joystickActive = true;
            this.startPos = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener("pointermove", (e) => {
            if (!this.joystickActive) return;
            const dx = e.clientX - this.startPos.x;
            const dy = e.clientY - this.startPos.y;
            const dist = Math.hypot(dx, dy);
            const clamped = Math.min(dist, this.maxRadius);
            const angle = Math.atan2(dy, dx);

            this.moveVector.x = (Math.cos(angle) * clamped) / this.maxRadius;
            this.moveVector.z = (Math.sin(angle) * clamped) / this.maxRadius;
        });

        window.addEventListener("pointerup", () => {
            this.joystickActive = false;
            this.moveVector.x = 0;
            this.moveVector.z = 0;
        });
    }

    getDirection(): { x: number; z: number } {
        let x = this.moveVector.x;
        let z = this.moveVector.z;

        if (this.keys.has("w") || this.keys.has("arrowup")) z -= 1;
        if (this.keys.has("s") || this.keys.has("arrowdown")) z += 1;
        if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
        if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;

        const length = Math.hypot(x, z);
        if (length > 1) {
            x /= length;
            z /= length;
        }

        return { x, z };
    }
}
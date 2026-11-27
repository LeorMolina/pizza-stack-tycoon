import type { UpgradeId, UpgradeView } from "./UpgradeSystem";

export class UIManager {
    private moneyEl: HTMLSpanElement;
    private stackEl: HTMLSpanElement;
    private upgradesEl: HTMLDivElement;
    private buttons = new Map<UpgradeId, HTMLButtonElement>();
    private onUpgradeClick?: (id: UpgradeId) => void;

    constructor(container: HTMLElement, onUpgradeClick?: (id: UpgradeId) => void) {
        this.onUpgradeClick = onUpgradeClick;

        const hud = document.createElement("div");
        hud.style.position = "absolute";
        hud.style.top = "16px";
        hud.style.left = "16px";
        hud.style.display = "flex";
        hud.style.flexDirection = "column";
        hud.style.gap = "10px";
        hud.style.fontFamily = "system-ui, -apple-system, sans-serif";
        hud.style.userSelect = "none";

        const statusRow = document.createElement("div");
        statusRow.style.display = "flex";
        statusRow.style.gap = "12px";
        statusRow.style.pointerEvents = "none";

        const badgeStyle = `
      background: rgba(15, 23, 42, 0.85);
      color: #f8fafc;
      padding: 10px 16px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

        const moneyBox = document.createElement("div");
        moneyBox.style.cssText = badgeStyle;
        moneyBox.innerHTML = `Caixa: <span id="hud-money" style="color: #4ade80;">$0</span>`;

        const stackBox = document.createElement("div");
        stackBox.style.cssText = badgeStyle;
        stackBox.innerHTML = `Pilha: <span id="hud-stack" style="color: #fbbf24;">0/12</span>`;

        statusRow.append(moneyBox, stackBox);

        this.upgradesEl = document.createElement("div");
        this.upgradesEl.style.display = "flex";
        this.upgradesEl.style.flexWrap = "wrap";
        this.upgradesEl.style.gap = "8px";
        this.upgradesEl.style.pointerEvents = "auto";

        hud.append(statusRow, this.upgradesEl);
        container.style.position = "relative";
        container.appendChild(hud);

        this.moneyEl = moneyBox.querySelector("#hud-money") as HTMLSpanElement;
        this.stackEl = stackBox.querySelector("#hud-stack") as HTMLSpanElement;
    }

    public update(money: number, currentStack: number, maxStack: number, upgrades: UpgradeView[] = []): void {
        this.moneyEl.textContent = `$${money}`;
        this.stackEl.textContent = `${currentStack}/${maxStack}`;

        for (const upg of upgrades) {
            let btn = this.buttons.get(upg.id);
            if (!btn) {
                btn = document.createElement("button");
                btn.type = "button";
                btn.style.border = "none";
                btn.style.borderRadius = "10px";
                btn.style.padding = "8px 12px";
                btn.style.fontWeight = "700";
                btn.style.fontSize = "13px";
                btn.style.cursor = "pointer";
                btn.style.boxShadow = "0 3px 10px rgba(0,0,0,0.18)";
                btn.style.transition = "transform 0.1s ease, opacity 0.15s ease";

                // Evita que clicar no botão inicie arraste de câmera/movimento no canvas
                btn.addEventListener("pointerdown", (e) => e.stopPropagation());
                btn.addEventListener("click", () => {
                    this.onUpgradeClick?.(upg.id);
                });

                this.buttons.set(upg.id, btn);
                this.upgradesEl.appendChild(btn);
            }

            const canAfford = money >= upg.cost;
            btn.disabled = !canAfford;
            btn.style.background = canAfford ? "#2563eb" : "rgba(30, 41, 59, 0.65)";
            btn.style.color = canAfford ? "#ffffff" : "#94a3b8";
            btn.style.opacity = canAfford ? "1" : "0.75";
            btn.style.cursor = canAfford ? "pointer" : "not-allowed";
            btn.textContent = `${upg.label} (Nv.${upg.level}) • $${upg.cost}`;
        }
    }
}
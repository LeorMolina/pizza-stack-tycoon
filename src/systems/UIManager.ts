export class UIManager {
    private moneyEl: HTMLSpanElement;
    private stackEl: HTMLSpanElement;

    constructor(container: HTMLElement) {
        const hud = document.createElement("div");
        hud.style.position = "absolute";
        hud.style.top = "16px";
        hud.style.left = "16px";
        hud.style.display = "flex";
        hud.style.gap = "12px";
        hud.style.fontFamily = "system-ui, -apple-system, sans-serif";
        hud.style.pointerEvents = "none";
        hud.style.userSelect = "none";

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

        hud.append(moneyBox, stackBox);
        container.style.position = "relative";
        container.appendChild(hud);

        this.moneyEl = moneyBox.querySelector("#hud-money") as HTMLSpanElement;
        this.stackEl = stackBox.querySelector("#hud-stack") as HTMLSpanElement;
    }

    update(money: number, currentStack: number, maxStack: number): void {
        this.moneyEl.textContent = `$${money}`;
        this.stackEl.textContent = `${currentStack}/${maxStack}`;
    }
}
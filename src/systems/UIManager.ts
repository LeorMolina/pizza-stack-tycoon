import type { UpgradeId, UpgradeView } from "./UpgradeSystem";

export class UIManager {
    private readonly root: HTMLDivElement;
    private readonly moneyEl: HTMLSpanElement;
    private readonly stackEl: HTMLSpanElement;
    private readonly servedEl: HTMLSpanElement;
    private readonly upgradesContainer: HTMLDivElement;
    private readonly onUpgradeClick: (id: UpgradeId) => void;

    constructor(container: HTMLElement, onUpgradeClick: (id: UpgradeId) => void) {
        this.onUpgradeClick = onUpgradeClick;

        this.root = document.createElement("div");
        this.root.style.position = "fixed";
        this.root.style.inset = "0";
        this.root.style.pointerEvents = "none";
        this.root.style.fontFamily = "system-ui, -apple-system, sans-serif";
        this.root.style.zIndex = "10";

        const topBar = document.createElement("div");
        topBar.style.display = "flex";
        topBar.style.gap = "12px";
        topBar.style.padding = "16px";
        topBar.style.flexWrap = "wrap";

        const moneyBadge = this.createBadge("#16a34a");
        moneyBadge.innerHTML = `Caixa: $<span id="hud-money">0</span>`;

        const stackBadge = this.createBadge("#ea580c");
        stackBadge.innerHTML = `Pilha: <span id="hud-stack">0/12</span>`;

        const servedBadge = this.createBadge("#0284c7");
        servedBadge.innerHTML = `Clientes: <span id="hud-served">0</span>`;

        topBar.append(moneyBadge, stackBadge, servedBadge);

        this.upgradesContainer = document.createElement("div");
        this.upgradesContainer.style.position = "fixed";
        this.upgradesContainer.style.right = "16px";
        this.upgradesContainer.style.bottom = "16px";
        this.upgradesContainer.style.display = "flex";
        this.upgradesContainer.style.flexDirection = "column";
        this.upgradesContainer.style.gap = "8px";
        this.upgradesContainer.style.pointerEvents = "auto";

        this.root.append(topBar, this.upgradesContainer);
        container.appendChild(this.root);

        this.moneyEl = topBar.querySelector("#hud-money") as HTMLSpanElement;
        this.stackEl = topBar.querySelector("#hud-stack") as HTMLSpanElement;
        this.servedEl = topBar.querySelector("#hud-served") as HTMLSpanElement;
    }

    private createBadge(bgColor: string): HTMLDivElement {
        const el = document.createElement("div");
        el.style.background = bgColor;
        el.style.color = "#ffffff";
        el.style.padding = "8px 14px";
        el.style.borderRadius = "999px";
        el.style.fontWeight = "700";
        el.style.fontSize = "14px";
        el.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.18)";
        return el;
    }

    public update(
        money: number,
        stackCount: number,
        maxStack: number,
        upgrades: UpgradeView[],
        servedCustomers = 0
    ): void {
        this.moneyEl.textContent = String(money);
        this.stackEl.textContent = `${stackCount}/${maxStack}`;
        this.servedEl.textContent = String(servedCustomers);

        this.upgradesContainer.innerHTML = "";
        for (const upg of upgrades) {
            const canAfford = money >= upg.cost;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.disabled = !canAfford;
            btn.style.padding = "10px 14px";
            btn.style.borderRadius = "12px";
            btn.style.border = "none";
            btn.style.fontWeight = "700";
            btn.style.fontSize = "13px";
            btn.style.cursor = canAfford ? "pointer" : "not-allowed";
            btn.style.background = canAfford ? "#1e293b" : "#94a3b8";
            btn.style.color = "#ffffff";
            btn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
            btn.textContent = `${upg.label} (Nv.${upg.level}) - $${upg.cost}`;
            btn.addEventListener("click", () => this.onUpgradeClick(upg.id));
            this.upgradesContainer.appendChild(btn);
        }
    }
}
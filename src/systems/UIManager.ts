import type { UpgradeId, UpgradeView } from "./UpgradeSystem";

export class UIManager {
    private readonly root: HTMLDivElement;
    private readonly moneyEl: HTMLSpanElement;
    private readonly stackEl: HTMLSpanElement;
    private readonly servedEl: HTMLSpanElement;
    private readonly levelEl: HTMLSpanElement;
    private readonly upgradesContainer: HTMLDivElement;
    private readonly upgradeButtons = new Map<UpgradeId, HTMLButtonElement>();
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
        moneyBadge.innerHTML = `Caixa: R$ <span id="hud-money">0</span>`;

        const stackBadge = this.createBadge("#ea580c");
        stackBadge.innerHTML = `Pilha: <span id="hud-stack">0/12</span>`;

        const servedBadge = this.createBadge("#0284c7");
        servedBadge.innerHTML = `Clientes: <span id="hud-served">0</span>`;

        const levelBadge = this.createBadge("#7c3aed");
        levelBadge.innerHTML = `Nível <span id="hud-level">1 (0/5)</span>`;

        topBar.append(moneyBadge, stackBadge, servedBadge, levelBadge);

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
        this.levelEl = topBar.querySelector("#hud-level") as HTMLSpanElement;
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

    public spawnFloatingPopup(
        screenX: number,
        screenY: number,
        text: string,
        color = "#16a34a"
    ): void {
        const popup = document.createElement("div");
        popup.textContent = text;
        popup.style.position = "fixed";
        popup.style.left = `${Math.round(screenX)}px`;
        popup.style.top = `${Math.round(screenY)}px`;
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.color = color;
        popup.style.fontWeight = "900";
        popup.style.fontSize = "18px";
        popup.style.textShadow = "0 2px 4px rgba(0, 0, 0, 0.35)";
        popup.style.pointerEvents = "none";
        popup.style.transition = "transform 0.75s ease-out, opacity 0.75s ease-out";
        popup.style.opacity = "1";

        this.root.appendChild(popup);

        requestAnimationFrame(() => {
            popup.style.transform = "translate(-50%, -140%)";
            popup.style.opacity = "0";
        });

        window.setTimeout(() => {
            popup.remove();
        }, 780);
    }

    private getOrCreateUpgradeButton(id: UpgradeId): HTMLButtonElement {
        let btn = this.upgradeButtons.get(id);
        if (!btn) {
            btn = document.createElement("button");
            btn.type = "button";
            btn.style.padding = "10px 14px";
            btn.style.borderRadius = "12px";
            btn.style.border = "none";
            btn.style.fontWeight = "700";
            btn.style.fontSize = "13px";
            btn.style.color = "#ffffff";
            btn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
            btn.addEventListener("click", () => this.onUpgradeClick(id));
            this.upgradeButtons.set(id, btn);
            this.upgradesContainer.appendChild(btn);
        }
        return btn;
    }

    public update(
        money: number,
        stackCount: number,
        maxStack: number,
        upgrades: UpgradeView[],
        servedCustomers = 0,
        level = 1,
        levelProgress = "0/5"
    ): void {
        this.moneyEl.textContent = String(money);
        this.stackEl.textContent = `${stackCount}/${maxStack}`;
        this.servedEl.textContent = String(servedCustomers);
        this.levelEl.textContent = `${level} (${levelProgress})`;

        for (const upg of upgrades) {
            const canAfford = money >= upg.cost;
            const btn = this.getOrCreateUpgradeButton(upg.id);
            const levelTag = upg.level > 0 ? ` (Nv.${upg.level})` : "";
            const label = `${upg.label}${levelTag} - R$ ${upg.cost}`;

            if (btn.disabled !== !canAfford) {
                btn.disabled = !canAfford;
                btn.style.cursor = canAfford ? "pointer" : "not-allowed";
                btn.style.background = canAfford ? "#1e293b" : "#94a3b8";
            }
            if (btn.textContent !== label) {
                btn.textContent = label;
            }
        }
    }
}
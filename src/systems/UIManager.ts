import type { UpgradeId, UpgradeView } from "./UpgradeSystem";

export class UIManager {
    private readonly root: HTMLDivElement;
    private readonly moneyEl: HTMLSpanElement;
    private readonly stackEl: HTMLSpanElement;
    private readonly servedEl: HTMLSpanElement;
    private readonly levelNumEl: HTMLSpanElement;
    private readonly levelTextEl: HTMLSpanElement;
    private readonly levelFillEl: HTMLDivElement;
    private readonly upgradesContainer: HTMLDivElement;
    private readonly upgradeButtons = new Map<UpgradeId, HTMLButtonElement>();
    private readonly onUpgradeClick: (id: UpgradeId) => void;
    private readonly saveBtn?: HTMLButtonElement;
    private readonly zoomBtn?: HTMLButtonElement;
    private modalOverlay?: HTMLDivElement;

    constructor(
        container: HTMLElement,
        onUpgradeClick: (id: UpgradeId) => void,
        onSaveGame?: () => void,
        onResetSave?: () => void,
        onToggleZoom?: () => boolean
    ) {
        this.onUpgradeClick = onUpgradeClick;

        this.root = document.createElement("div");
        this.root.style.position = "fixed";
        this.root.style.inset = "0";
        this.root.style.pointerEvents = "none";
        this.root.style.fontFamily = "system-ui, -apple-system, sans-serif";
        this.root.style.zIndex = "10";

        const topBar = document.createElement("div");
        topBar.style.display = "flex";
        topBar.style.justifyContent = "space-between";
        topBar.style.alignItems = "flex-start";
        topBar.style.padding = "16px";
        topBar.style.gap = "12px";
        topBar.style.flexWrap = "wrap";

        // Esquerda: Pilha, Clientes e Botão de Câmera
        const leftGroup = document.createElement("div");
        leftGroup.style.display = "flex";
        leftGroup.style.gap = "10px";
        leftGroup.style.flexWrap = "wrap";
        leftGroup.style.alignItems = "center";

        const stackBadge = this.createBadge("#ea580c");
        stackBadge.innerHTML = `Pilha: <span id="hud-stack">0/12</span>`;

        const servedBadge = this.createBadge("#0284c7");
        servedBadge.innerHTML = `Clientes: <span id="hud-served">0</span>`;

        leftGroup.append(stackBadge, servedBadge);

        if (onToggleZoom) {
            this.zoomBtn = document.createElement("button");
            this.zoomBtn.type = "button";
            this.zoomBtn.textContent = "Visão Geral";
            this.zoomBtn.title = "Use também a rodinha do mouse para dar zoom";
            this.zoomBtn.style.pointerEvents = "auto";
            this.zoomBtn.style.background = "rgba(15, 23, 42, 0.85)";
            this.zoomBtn.style.color = "#ffffff";
            this.zoomBtn.style.padding = "8px 14px";
            this.zoomBtn.style.border = "none";
            this.zoomBtn.style.borderRadius = "999px";
            this.zoomBtn.style.fontWeight = "700";
            this.zoomBtn.style.fontSize = "13px";
            this.zoomBtn.style.cursor = "pointer";
            this.zoomBtn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.18)";
            this.zoomBtn.addEventListener("click", () => {
                const isOverview = onToggleZoom();
                if (this.zoomBtn) {
                    this.zoomBtn.textContent = isOverview ? "Aproximar" : "Visão Geral";
                }
            });
            leftGroup.appendChild(this.zoomBtn);
        }

        // Centro: Estrela de Nível + Barra de Progresso Verde
        const centerGroup = document.createElement("div");
        centerGroup.style.display = "flex";
        centerGroup.style.alignItems = "center";
        centerGroup.style.gap = "10px";
        centerGroup.style.background = "rgba(15, 23, 42, 0.82)";
        centerGroup.style.padding = "6px 14px 6px 8px";
        centerGroup.style.borderRadius = "999px";
        centerGroup.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.22)";

        const starBadge = document.createElement("div");
        starBadge.style.width = "30px";
        starBadge.style.height = "30px";
        starBadge.style.borderRadius = "50%";
        starBadge.style.background = "linear-gradient(135deg, #facc15, #eab308)";
        starBadge.style.color = "#422006";
        starBadge.style.fontWeight = "900";
        starBadge.style.fontSize = "14px";
        starBadge.style.display = "flex";
        starBadge.style.alignItems = "center";
        starBadge.style.justifyContent = "center";
        starBadge.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.25)";
        starBadge.innerHTML = `<span id="hud-level-num">1</span>`;

        const progressTrack = document.createElement("div");
        progressTrack.style.position = "relative";
        progressTrack.style.width = "130px";
        progressTrack.style.height = "20px";
        progressTrack.style.background = "#334155";
        progressTrack.style.borderRadius = "999px";
        progressTrack.style.overflow = "hidden";
        progressTrack.style.display = "flex";
        progressTrack.style.alignItems = "center";
        progressTrack.style.justifyContent = "center";

        this.levelFillEl = document.createElement("div");
        this.levelFillEl.style.position = "absolute";
        this.levelFillEl.style.left = "0";
        this.levelFillEl.style.top = "0";
        this.levelFillEl.style.bottom = "0";
        this.levelFillEl.style.width = "0%";
        this.levelFillEl.style.background = "linear-gradient(90deg, #22c55e, #16a34a)";
        this.levelFillEl.style.transition = "width 0.25s ease-out";

        this.levelTextEl = document.createElement("span");
        this.levelTextEl.style.position = "relative";
        this.levelTextEl.style.zIndex = "1";
        this.levelTextEl.style.color = "#ffffff";
        this.levelTextEl.style.fontWeight = "800";
        this.levelTextEl.style.fontSize = "12px";
        this.levelTextEl.style.textShadow = "0 1px 2px rgba(0, 0, 0, 0.5)";
        this.levelTextEl.textContent = "0/5";

        progressTrack.append(this.levelFillEl, this.levelTextEl);
        centerGroup.append(starBadge, progressTrack);

        // Direita: Caixa (R$) + Salvar / Resetar
        const rightGroup = document.createElement("div");
        rightGroup.style.display = "flex";
        rightGroup.style.alignItems = "center";
        rightGroup.style.gap = "8px";
        rightGroup.style.flexWrap = "wrap";

        const moneyBadge = this.createBadge("#16a34a");
        moneyBadge.style.fontSize = "15px";
        moneyBadge.innerHTML = `R$ <span id="hud-money">0</span>`;
        rightGroup.appendChild(moneyBadge);

        if (onSaveGame) {
            this.saveBtn = document.createElement("button");
            this.saveBtn.type = "button";
            this.saveBtn.textContent = "Salvar";
            this.saveBtn.style.pointerEvents = "auto";
            this.saveBtn.style.background = "#0f766e";
            this.saveBtn.style.color = "#ffffff";
            this.saveBtn.style.padding = "8px 12px";
            this.saveBtn.style.border = "none";
            this.saveBtn.style.borderRadius = "999px";
            this.saveBtn.style.fontWeight = "700";
            this.saveBtn.style.fontSize = "12px";
            this.saveBtn.style.cursor = "pointer";
            this.saveBtn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.18)";
            this.saveBtn.addEventListener("click", () => {
                onSaveGame();
                this.flashSavedFeedback();
            });
            rightGroup.appendChild(this.saveBtn);
        }

        if (onResetSave) {
            const resetBtn = document.createElement("button");
            resetBtn.type = "button";
            resetBtn.textContent = "Resetar";
            resetBtn.style.pointerEvents = "auto";
            resetBtn.style.background = "rgba(30, 41, 59, 0.85)";
            resetBtn.style.color = "#f8fafc";
            resetBtn.style.padding = "8px 12px";
            resetBtn.style.border = "none";
            resetBtn.style.borderRadius = "999px";
            resetBtn.style.fontWeight = "700";
            resetBtn.style.fontSize = "12px";
            resetBtn.style.cursor = "pointer";
            resetBtn.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.18)";
            resetBtn.addEventListener("click", () => {
                this.openProgressModal(onSaveGame, onResetSave);
            });
            rightGroup.appendChild(resetBtn);
        }

        topBar.append(leftGroup, centerGroup, rightGroup);

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
        this.levelNumEl = topBar.querySelector("#hud-level-num") as HTMLSpanElement;
    }

    public syncZoomButtonLabel(isOverview: boolean): void {
        if (this.zoomBtn) {
            this.zoomBtn.textContent = isOverview ? "Aproximar" : "Visão Geral";
        }
    }

    private flashSavedFeedback(): void {
        if (!this.saveBtn) return;
        this.saveBtn.textContent = "Salvo!";
        this.saveBtn.style.background = "#16a34a";
        window.setTimeout(() => {
            if (!this.saveBtn) return;
            this.saveBtn.textContent = "Salvar";
            this.saveBtn.style.background = "#0f766e";
        }, 1200);
    }

    private closeProgressModal(): void {
        if (this.modalOverlay) {
            this.modalOverlay.remove();
            this.modalOverlay = undefined;
        }
    }

    private openProgressModal(onSaveGame?: () => void, onResetSave?: () => void): void {
        this.closeProgressModal();

        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(15, 23, 42, 0.55)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.pointerEvents = "auto";
        overlay.style.zIndex = "50";

        const card = document.createElement("div");
        card.style.background = "#ffffff";
        card.style.color = "#0f172a";
        card.style.padding = "22px 24px";
        card.style.borderRadius = "16px";
        card.style.maxWidth = "340px";
        card.style.width = "90%";
        card.style.boxShadow = "0 16px 36px rgba(0, 0, 0, 0.28)";
        card.style.textAlign = "center";

        const title = document.createElement("div");
        title.textContent = "Progresso do Jogo";
        title.style.fontSize = "18px";
        title.style.fontWeight = "800";
        title.style.marginBottom = "8px";

        const desc = document.createElement("div");
        desc.textContent = "Deseja salvar o progresso atual ou resetar tudo e começar do zero?";
        desc.style.fontSize = "14px";
        desc.style.color = "#475569";
        desc.style.marginBottom = "18px";
        desc.style.lineHeight = "1.4";

        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.justifyContent = "center";
        actions.style.flexWrap = "wrap";

        if (onSaveGame) {
            const saveChoiceBtn = document.createElement("button");
            saveChoiceBtn.type = "button";
            saveChoiceBtn.textContent = "Salvar";
            saveChoiceBtn.style.padding = "9px 16px";
            saveChoiceBtn.style.borderRadius = "10px";
            saveChoiceBtn.style.border = "none";
            saveChoiceBtn.style.background = "#16a34a";
            saveChoiceBtn.style.color = "#ffffff";
            saveChoiceBtn.style.fontWeight = "700";
            saveChoiceBtn.style.cursor = "pointer";
            saveChoiceBtn.addEventListener("click", () => {
                onSaveGame();
                this.flashSavedFeedback();
                this.closeProgressModal();
            });
            actions.appendChild(saveChoiceBtn);
        }

        if (onResetSave) {
            const resetChoiceBtn = document.createElement("button");
            resetChoiceBtn.type = "button";
            resetChoiceBtn.textContent = "Resetar";
            resetChoiceBtn.style.padding = "9px 16px";
            resetChoiceBtn.style.borderRadius = "10px";
            resetChoiceBtn.style.border = "none";
            resetChoiceBtn.style.background = "#dc2626";
            resetChoiceBtn.style.color = "#ffffff";
            resetChoiceBtn.style.fontWeight = "700";
            resetChoiceBtn.style.cursor = "pointer";
            resetChoiceBtn.addEventListener("click", () => {
                this.closeProgressModal();
                onResetSave();
            });
            actions.appendChild(resetChoiceBtn);
        }

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.textContent = "Cancelar";
        cancelBtn.style.padding = "9px 14px";
        cancelBtn.style.borderRadius = "10px";
        cancelBtn.style.border = "none";
        cancelBtn.style.background = "#e2e8f0";
        cancelBtn.style.color = "#334155";
        cancelBtn.style.fontWeight = "700";
        cancelBtn.style.cursor = "pointer";
        cancelBtn.addEventListener("click", () => this.closeProgressModal());
        actions.appendChild(cancelBtn);

        card.append(title, desc, actions);
        overlay.appendChild(card);
        this.root.appendChild(overlay);
        this.modalOverlay = overlay;
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
        this.levelNumEl.textContent = String(level);
        this.levelTextEl.textContent = levelProgress;

        const parts = levelProgress.split("/");
        const current = Number(parts[0]) || 0;
        const total = Number(parts[1]) || 5;
        const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
        this.levelFillEl.style.width = `${pct}%`;

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
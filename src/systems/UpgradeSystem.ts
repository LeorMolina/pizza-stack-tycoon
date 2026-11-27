import { Player } from "../entities/Player";
import { PizzaStation } from "../entities/PizzaStation";
import { Helper } from "../entities/Helper";
import { DeliveryHelper } from "../entities/DeliveryHelper";

export type UpgradeId = "stack" | "speed" | "production" | "helper" | "runner";

export interface UpgradeView {
    id: UpgradeId;
    label: string;
    level: number;
    cost: number;
}

export class UpgradeSystem {
    private levels: Record<UpgradeId, number> = {
        stack: 1,
        speed: 1,
        production: 1,
        helper: 0,
        runner: 0
    };

    private baseCosts: Record<UpgradeId, number> = {
        stack: 50,
        speed: 65,
        production: 80,
        helper: 120,
        runner: 220
    };

    public getCost(id: UpgradeId): number {
        const isStaff = id === "helper" || id === "runner";
        const exp = isStaff ? this.levels[id] : this.levels[id] - 1;
        return Math.round(this.baseCosts[id] * Math.pow(1.55, Math.max(0, exp)));
    }

    public getViews(): UpgradeView[] {
        const helperLabel = this.levels.helper === 0 ? "Contratar Ajudante" : "Ajudante +Vel";
        const runnerLabel = this.levels.runner === 0 ? "Contratar Entregador" : "Entregador +Vel";

        return [
            { id: "stack", label: "Pilha +4", level: this.levels.stack, cost: this.getCost("stack") },
            { id: "speed", label: "Vel +1.5", level: this.levels.speed, cost: this.getCost("speed") },
            { id: "production", label: "Forno", level: this.levels.production, cost: this.getCost("production") },
            { id: "helper", label: helperLabel, level: this.levels.helper, cost: this.getCost("helper") },
            { id: "runner", label: runnerLabel, level: this.levels.runner, cost: this.getCost("runner") }
        ];
    }

    public tryBuy(
        id: UpgradeId,
        currentMoney: number,
        player: Player,
        station: PizzaStation,
        helper: Helper,
        runner: DeliveryHelper
    ): { purchased: boolean; newMoney: number } {
        const cost = this.getCost(id);
        if (currentMoney < cost) {
            return { purchased: false, newMoney: currentMoney };
        }

        if (id === "stack") {
            player.increaseMaxStack(4);
        } else if (id === "speed") {
            player.increaseSpeed(1.5);
        } else if (id === "production") {
            station.increaseProductionSpeed(0.85);
        } else if (id === "helper") {
            if (this.levels.helper === 0) {
                helper.hire();
            } else {
                helper.upgrade();
            }
        } else if (id === "runner") {
            if (this.levels.runner === 0) {
                runner.hire();
            } else {
                runner.upgrade();
            }
        }

        this.levels[id] += 1;
        return { purchased: true, newMoney: currentMoney - cost };
    }
}
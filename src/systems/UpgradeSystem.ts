import { Player } from "../entities/Player";
import { PizzaStation } from "../entities/PizzaStation";

export type UpgradeId = "stack" | "speed" | "production";

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
        production: 1
    };

    private baseCosts: Record<UpgradeId, number> = {
        stack: 60,
        speed: 75,
        production: 90
    };

    public getCost(id: UpgradeId): number {
        return Math.round(this.baseCosts[id] * Math.pow(1.45, this.levels[id] - 1));
    }

    public getViews(): UpgradeView[] {
        return [
            { id: "stack", label: "Pilha +4", level: this.levels.stack, cost: this.getCost("stack") },
            { id: "speed", label: "Vel +1.5", level: this.levels.speed, cost: this.getCost("speed") },
            { id: "production", label: "Forno", level: this.levels.production, cost: this.getCost("production") }
        ];
    }

    public tryBuy(
        id: UpgradeId,
        currentMoney: number,
        player: Player,
        station: PizzaStation
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
        }

        this.levels[id] += 1;
        return { purchased: true, newMoney: currentMoney - cost };
    }
}
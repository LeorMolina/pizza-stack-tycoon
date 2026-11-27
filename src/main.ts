import "./style.css";
import { GameEngine } from "./core/GameEngine";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
    new GameEngine(app);
}
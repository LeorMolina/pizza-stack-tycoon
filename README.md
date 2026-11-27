# Pizza Stack Tycoon

Jogo 3D **Idle Tycoon** *mobile-first* desenvolvido com **TypeScript**, **Three.js** e **Vite**, focado em arquitetura modular, feedback visual e progressão por melhorias.

## Funcionalidades Atuais

- **Cena 3D & Câmera:** câmera em perspectiva acompanhando o jogador em um cenário isométrico com iluminação e sombras.
- **Controle Responsivo:** movimentação por teclado e toque/arraste (`InputController`).
- **Produção & Coleta (`PizzaStation`):** produção contínua de pizzas na bancada com exibição prévia antes do trajeto até o jogador.
- **Pilha Dinâmica (`Player`):** empilhamento de pizzas nas costas com balanço visual (`sway`) proporcional ao peso/quantidade e limites configuráveis.
- **Entrega & Caixa (`DeliveryCounter` + `UIManager`):** área de entrega com pulso visual, animação das pizzas voando em arco até o balcão e HUD exibindo saldo em caixa e capacidade da pilha.
- **Colisões:** resolução de colisão contra a bancada, o balcão de entrega e os limites do chão.
- **Sistema de Upgrades (`UpgradeSystem`):** melhorias compráveis com o dinheiro do caixa para aumentar a capacidade máxima da pilha, a velocidade de movimento e o ritmo de produção do forno.

## Estrutura do Projeto

```text
src/
├── core/        # GameEngine e loop principal da simulação 3D
├── entities/    # Player, PizzaStation e DeliveryCounter
└── systems/     # InputController, UIManager e UpgradeSystem

## Como Rodar Localmente

```bash
npm install
npm run dev

## Para gerar o build de produção

```bash
npm run build
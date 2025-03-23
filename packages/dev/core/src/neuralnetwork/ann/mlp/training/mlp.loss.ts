import { ILossFunction } from "./mlp.interfaces.training";

export const LossFunctions = {
    mse: {
        loss: (o: number, y: number) => 0.5 * Math.pow(o - y, 2),
        dLoss: (o: number, y: number) => o - y,
    },
    crossEntropy: {
        loss: (o: number, y: number) => -y * Math.log(o + 1e-8) - (1 - y) * Math.log(1 - o + 1e-8),
        dLoss: (o: number, y: number) => (o - y) / ((o + 1e-8) * (1 - o + 1e-8)),
    },
} satisfies Record<string, ILossFunction>;

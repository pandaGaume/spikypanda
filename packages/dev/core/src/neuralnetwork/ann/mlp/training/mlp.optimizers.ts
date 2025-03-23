/// <summary>
/// Stochastic Gradient Descent (SGD) optimizer

import { IBackpropSynapseContext, IOptimizer } from "./mlp.interfaces.training";

/// </summary>
export const SGD: IOptimizer = {
    apply(synapse, lr, gradient, ctx) {
        const bag = (synapse.bag ??= { gradient: gradient }) as IBackpropSynapseContext;

        bag.gradient = gradient;
        bag.weightDelta = -lr * gradient;

        synapse.weight += bag.weightDelta;
    },
};

/// <summary>
/// SGD with Momentum optimizer
/// </summary>
export const MomentumSGD = (momentum: number): IOptimizer => ({
    apply(synapse, lr, gradient, ctx) {
        const bag = (synapse.bag ??= { gradient: gradient }) as IBackpropSynapseContext;

        bag.gradient = gradient;
        bag.velocity ??= 0;

        bag.velocity = momentum * bag.velocity - lr * gradient;
        bag.weightDelta = bag.velocity;

        synapse.weight += bag.weightDelta;
    },
});

/// <summary>
/// Nesterov Accelerated Gradient (NAG) optimizer
/// </summary>
export const NAG = (momentum: number = 0.9): IOptimizer => ({
    apply(synapse, lr, gradient, ctx) {
        const bag = (synapse.bag ??= { gradient: gradient }) as IBackpropSynapseContext;

        bag.gradient = gradient;
        bag.velocity ??= 0;

        bag.velocity = momentum * bag.velocity - lr * gradient;
        bag.weightDelta = bag.velocity;

        synapse.weight += bag.weightDelta;
        bag.prelookedWeight = undefined;
    },
});

/// <summary>
/// Adam optimizer with bias correction
/// </summary>
export function Adam(beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8): IOptimizer {
    return {
        apply(synapse, lr, gradient, ctx) {
            const bag = (synapse.bag ??= { gradient: gradient }) as IBackpropSynapseContext;
            const t = ctx.iteration + 1;

            bag.gradient = gradient;
            bag.m ??= 0;
            bag.v ??= 0;

            bag.m = beta1 * bag.m + (1 - beta1) * gradient;
            bag.v = beta2 * bag.v + (1 - beta2) * gradient * gradient;

            const mHat = bag.m / (1 - Math.pow(beta1, t));
            const vHat = bag.v / (1 - Math.pow(beta2, t));

            bag.weightDelta = (-lr * mHat) / (Math.sqrt(vHat) + epsilon);
            synapse.weight += bag.weightDelta;
        },
    };
}

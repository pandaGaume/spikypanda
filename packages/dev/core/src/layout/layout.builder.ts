import { GraphBuilder, IGraph, IGraphItem, INode, IOlink } from "../graph";
import { Nullable } from "../types";

export class LayoutBuilderOptions {
    public static Default: LayoutBuilderOptions = new LayoutBuilderOptions();
}

export interface ITopologyBuilder {}

export interface IGeometryBuilder {}

export interface IGraphItemInitializer<T extends IGraphItem> {}

class LayoutBuilderSet {
    dimension: number = 0;
    shape: number[] = [];
    topology?: ITopologyBuilder;
    geometry?: IGeometryBuilder;
    initializers?: IGraphItemInitializer<IGraphItem>[];

    constructor(shape: number[], dimension: number) {
        this.dimension = dimension;
        this.shape = shape;
    }
}

/// <summary>
/// The LayoutBuilder is designed to construct a graph layout step by step.
/// It follows a builder pattern where methods can be chained in the following order:
///
/// - `withSet()`: Defines a new set of nodes.
/// - `withTopology()`: Configures the connectivity for the current set.
/// - `withGeometry()`: Assigns spatial positions to the current set.
/// - The pattern can be repeated multiple times, allowing for multiple layers of organization.
///
/// The first `withSet()` call establishes the input nodes, and the last `withSet()` defines the output nodes.
/// The `currentSet` property tracks the index of the most recent set.
/// </summary>
/// <typeparam name="N">Type extending INode</typeparam>
/// <typeparam name="L">Type extending IOlink</typeparam>
export class LayoutBuilder<N extends INode, L extends IOlink> {
    _options: LayoutBuilderOptions;
    _graphBuilder: GraphBuilder<N, L>;
    _set: Array<LayoutBuilderSet> = [];
    _currentSet: number = -1; // Tracks the index of the current set

    /// <summary>
    /// Initializes a new instance of the LayoutBuilder class.
    /// </summary>
    /// <param name="graphBuilder">Optional GraphBuilder instance. If not provided, a new one is created.</param>
    /// <param name="options">Optional LayoutBuilderOptions instance. Uses default settings if not provided.</param>
    public constructor(graphBuilder?: GraphBuilder<N, L>, options?: LayoutBuilderOptions) {
        this._graphBuilder = graphBuilder ?? new GraphBuilder();
        this._options = options ?? LayoutBuilderOptions.Default;
    }

    /// <summary>
    /// Defines a new set of nodes and updates `currentSet`. The first call establishes inputs,
    /// and subsequent calls define intermediate or output sets.
    /// </summary>
    /// <returns>The current instance of LayoutBuilder for chaining.</returns>
    public withSet(shape: number | number[], dimension?: number): LayoutBuilder<N, L> {
        this._currentSet++;
        if (Array.isArray(shape)) {
            if (shape.length === 0) {
                throw new Error("shape must have at least one element");
            }
            dimension = Math.min(shape.length, dimension ?? shape.length);
            this._set[this._currentSet] = new LayoutBuilderSet(shape, dimension);
        } else {
            this._set[this._currentSet] = new LayoutBuilderSet([shape], 1);
        }
        return this;
    }

    /// <summary>
    /// Configures the topology for the current set of nodes.
    /// Requires at least one `withSet()` call before usage.
    /// </summary>
    /// <returns>The current instance of LayoutBuilder for chaining.</returns>
    public withTopology(t: ITopologyBuilder): LayoutBuilder<N, L> {
        if (this._currentSet < 0) {
            throw new Error("withTopology() must be called after at least one withSet() call.");
        }
        this._set[this._currentSet].topology = t;
        return this;
    }

    /// <summary>
    /// Assigns spatial positions to the current set of nodes.
    /// Requires at least one `withSet()` call before usage.
    /// </summary>
    /// <returns>The current instance of LayoutBuilder for chaining.</returns>
    public withGeometry(g: IGeometryBuilder): LayoutBuilder<N, L> {
        if (this._currentSet < 0) {
            throw new Error("withGeometry() must be called after at least one withSet() call.");
        }
        this._set[this._currentSet].geometry = g;
        return this;
    }

    public withInitializers(i: IGraphItemInitializer<IGraphItem> | IGraphItemInitializer<IGraphItem>[]): LayoutBuilder<N, L> {
        if (this._currentSet < 0) {
            throw new Error("withInitializers() must be called after at least one withSet() call.");
        }
        if (this._set[this._currentSet].initializers === undefined) {
            this._set[this._currentSet].initializers = Array.isArray(i) ? i : [i];
            return this;
        }
        this._set[this._currentSet].initializers?.push(...(Array.isArray(i) ? i : [i]));
        return this;
    }

    public build<T extends IGraph<N, L>>(...args: any[]): Nullable<T> {
        return null;
    }
}

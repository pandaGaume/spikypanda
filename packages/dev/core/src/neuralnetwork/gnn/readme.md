# What a GNN is and how it computes

A Graph Neural Network (GNN) is not a single fixed topology of an artificial neural network. It is a family of models that operate on graphs using a computation scheme called message passing. The graph provides nodes and edges with features. The neural network provides learnable functions that transform and propagate information over this graph.

At each layer, every edge computes a message. This message is a learned function, often a small multilayer perceptron, that takes as input the source node features, the edge features, and sometimes the target node features. These messages are real-valued vectors, not spikes or thresholded events.

For each node, all incoming messages from its neighbors are aggregated with a permutation-invariant operation, typically a sum or a mean. The node then updates its state by combining its previous state with the aggregated message using another learned function, again often a small multilayer perceptron with a residual connection.

This message-aggregate-update cycle is repeated for several layers. Early layers mix information from immediate neighbors. Deeper layers allow each node to integrate context from a wider neighborhood. The final node states are fed to a decoder that maps them to the desired outputs, such as displacements, stresses, classes, or any other per-node quantities. Variants may output values on edges or for the whole graph.

Key properties include parameter sharing across all edges and nodes, invariance of the aggregation to the ordering of neighbors, and the ability to include edge features explicitly. These properties let a trained GNN handle graphs of different sizes and connectivities while preserving the essential structure of the underlying domain.

```
# Nodes and edges
V = [A, B, C, D]
E = [(A,B), (C,B), (B,D)]           # directed for notation; if your graph is undirected, add both directions

# Inputs
x[A], x[B], x[C], x[D]              # raw node features
e[(A,B)], e[(C,B)], e[(B,D)]        # raw edge features (optional)

# Learnable functions (shared across the graph)
h_enc = MLP_node_encoder()
e_enc = MLP_edge_encoder()
phi    = MLP_message()              # message function
psi    = MLP_update()               # node update
dec    = MLP_decoder()              # node-wise output

# Encode raw features to latent vectors
h[A] = h_enc(x[A])
h[B] = h_enc(x[B])
h[C] = h_enc(x[C])
h[D] = h_enc(x[D])

e_lat[(A,B)] = e_enc(e[(A,B)])
e_lat[(C,B)] = e_enc(e[(C,B)])
e_lat[(B,D)] = e_enc(e[(B,D)])

# Message Passing for L layers (a layer is a message passing laps)
for layer in range(L):

    # 1) Edge messages (source i -> target j)
    m[(A,B)] = phi(h[A], h[B], e_lat[(A,B)])
    m[(C,B)] = phi(h[C], h[B], e_lat[(C,B)])
    m[(B,D)] = phi(h[B], h[D], e_lat[(B,D)])

    # 2) Permutation-invariant aggregation at each node (sum of incoming messages)
    M[A] = 0
    M[B] = m[(A,B)] + m[(C,B)]
    M[C] = 0
    M[D] = m[(B,D)]

    # 3) Node updates with residual connection
    h[A] = h[A] + psi(h[A], M[A])
    h[B] = h[B] + psi(h[B], M[B])
    h[C] = h[C] + psi(h[C], M[C])
    h[D] = h[D] + psi(h[D], M[D])

# Decode node-wise outputs (e.g., displacement, stress, class, etc.)
y[A] = dec(h[A])
y[B] = dec(h[B])
y[C] = dec(h[C])
y[D] = dec(h[D])
```

## What a Layer is ?

In a GNN, a layer is one full round of message passing and node state update. It is the basic unit you stack, just like layers in an MLP.

At the start, each node has a vector h produced by the encoder. One layer takes all current node states, computes messages on every edge, aggregates the incoming messages at each node (for example by summing them), updates each node’s state using that aggregated message, then stops. If you use L layers, you repeat this cycle L times, reusing the same learned functions.

What L changes. With 1 layer, a node can only use information from its immediate neighbors. With 2 layers, it also sees neighbors of neighbors. As L grows, each node’s receptive field expands across the graph. Too small L can miss context; too large L can over-smooth the representations and add cost.

Relation to encoder and decoder. The encoder prepares the initial h vectors before any layer runs. The L layers do the message passing. The decoder reads the final h and maps them to outputs.

Your mini graph with edges (A,B), (C,B), (B,D). With L = 1, B receives information from A and C; D receives from B; A and C receive nothing if edges are one-way. With L = 2, D can now receive the influence of A and C through B; if edges are treated both ways, A and C start receiving influence through B as well. More layers mean information travels farther through the graph before you decode the result.

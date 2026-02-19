// Neural network construction and feed-forward for biosim4
// Port of indiv.cpp (connectNeuralNetWiringFromGenome) and feedForward.cpp

import {
  Gene, Genome, NeuralNet, NeuralConnection, Neuron,
  Sensor, Action, SENSOR, NEURON, ACTION,
  geneWeight,
} from './types';

/**
 * Build a neural net from a genome.
 * Maps gene source/sink IDs to actual sensor/neuron/action indices,
 * then prunes unconnected neurons.
 */
export function buildNeuralNet(
  genome: Genome,
  numInternalNeurons: number,
): NeuralNet {
  const numSensors = Sensor.NUM_SENSES as number;
  const numActions = Action.NUM_ACTIONS as number;

  // Map genes to connections with renumbered IDs
  const connections: NeuralConnection[] = [];

  for (const gene of genome) {
    const conn: NeuralConnection = {
      sourceType: gene.sourceType,
      sourceId: gene.sourceType === SENSOR
        ? gene.sourceId % numSensors
        : gene.sourceId % numInternalNeurons,
      sinkType: gene.sinkType,
      sinkId: gene.sinkType === ACTION
        ? gene.sinkId % numActions
        : gene.sinkId % numInternalNeurons,
      weight: geneWeight(gene),
    };
    connections.push(conn);
  }

  // Create internal neurons
  const neurons: Neuron[] = [];
  for (let i = 0; i < numInternalNeurons; i++) {
    neurons.push({ output: 0.5, driven: false });
  }

  // Mark neurons that are driven (have at least one input)
  for (const conn of connections) {
    if (conn.sinkType === NEURON) {
      neurons[conn.sinkId].driven = true;
    }
  }

  // Prune connections: remove connections where source neuron is not driven
  // and not a sensor. Iterate until stable.
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = connections.length - 1; i >= 0; i--) {
      const conn = connections[i];
      // If source is an internal neuron that isn't driven, remove connection
      if (conn.sourceType === NEURON && !neurons[conn.sourceId].driven) {
        connections.splice(i, 1);
        changed = true;
      }
    }
    // Recompute driven status
    for (const n of neurons) n.driven = false;
    for (const conn of connections) {
      if (conn.sinkType === NEURON) {
        neurons[conn.sinkId].driven = true;
      }
    }
  }

  // Remove connections to action outputs that have no path from a sensor
  // (already handled by the pruning above)

  return { connections, neurons };
}

/**
 * Feed-forward: compute action levels from sensor inputs through the neural net.
 * Returns an array of action levels indexed by Action enum.
 */
export function feedForward(
  nnet: NeuralNet,
  sensorValues: Float32Array,
): Float32Array {
  const numActions = Action.NUM_ACTIONS as number;
  const actionLevels = new Float32Array(numActions);

  // Reset neuron inputs accumulator
  const neuronAccum = new Float32Array(nnet.neurons.length);

  // Phase 1: propagate sensor and neuron outputs to neuron and action accumulators
  for (const conn of nnet.connections) {
    // Get source output
    let sourceOutput: number;
    if (conn.sourceType === SENSOR) {
      sourceOutput = sensorValues[conn.sourceId];
    } else {
      sourceOutput = nnet.neurons[conn.sourceId].output;
    }

    // Multiply by weight and add to sink accumulator
    const inputVal = sourceOutput * conn.weight;

    if (conn.sinkType === ACTION) {
      actionLevels[conn.sinkId] += inputVal;
    } else {
      neuronAccum[conn.sinkId] += inputVal;
    }
  }

  // Phase 2: apply activation function to internal neurons
  for (let i = 0; i < nnet.neurons.length; i++) {
    if (nnet.neurons[i].driven) {
      nnet.neurons[i].output = Math.tanh(neuronAccum[i]);
    }
  }

  // Apply tanh to action outputs
  for (let i = 0; i < numActions; i++) {
    actionLevels[i] = Math.tanh(actionLevels[i]);
  }

  return actionLevels;
}

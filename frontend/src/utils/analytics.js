/**
 * Analytics utilities for computing model personality profiles
 * from LLM Council conversation data
 */

/**
 * Calculate personality profile for a single model based on its rankings
 */
function calculateModelPersonality(modelName, conversations) {
  const rankings = [];
  const selfRankings = [];
  const givenRankings = {}; // Track rankings given to other models
  const receivedRankings = {}; // Track positions received from other models

  // Extract all ranking data for this model
  conversations.forEach(conv => {
    conv.messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.stage2 && msg.metadata) {
        // Find this model's ranking
        const myRanking = msg.stage2.find(r => r.model === modelName);
        if (myRanking && myRanking.parsed_ranking) {
          // Track what this model ranked
          myRanking.parsed_ranking.forEach((label, position) => {
            const targetModel = msg.metadata.label_to_model[label.trim()];
            if (targetModel) {
              if (!givenRankings[targetModel]) {
                givenRankings[targetModel] = [];
              }
              givenRankings[targetModel].push(position + 1); // 1-indexed

              // Track if ranking self
              if (targetModel === modelName) {
                selfRankings.push(position + 1);
              }
            }
          });
        }

        // Track rankings received from other models
        msg.stage2.forEach(ranking => {
          if (ranking.model !== modelName && ranking.parsed_ranking) {
            ranking.parsed_ranking.forEach((label, position) => {
              const targetModel = msg.metadata.label_to_model[label.trim()];
              if (targetModel === modelName) {
                if (!receivedRankings[ranking.model]) {
                  receivedRankings[ranking.model] = [];
                }
                receivedRankings[ranking.model].push(position + 1); // 1-indexed
              }
            });
          }
        });
      }
    });
  });

  // Calculate statistics
  const stats = {
    modelName,
    totalRankingsGiven: Object.values(givenRankings).reduce((sum, arr) => sum + arr.length, 0),
    totalRankingsReceived: Object.values(receivedRankings).reduce((sum, arr) => sum + arr.length, 0),
    self_assessment: calculateMean(selfRankings),
    self_assessment_count: selfRankings.length,
  };

  // Calculate how harsh/generous to each model
  const harshness = {};
  Object.entries(givenRankings).forEach(([model, positions]) => {
    harshness[model] = {
      avgRank: calculateMean(positions),
      count: positions.length
    };
  });
  stats.givenRankings = harshness;

  // Calculate how others rank this model
  const receivedStats = {};
  Object.entries(receivedRankings).forEach(([model, positions]) => {
    receivedStats[model] = {
      avgRank: calculateMean(positions),
      count: positions.length
    };
  });
  stats.receivedRankings = receivedStats;

  // Calculate overall average rank received (consensus)
  const allReceived = Object.values(receivedRankings).flat();
  stats.average_rank_received = calculateMean(allReceived);
  stats.consistency = calculateVariance(allReceived); // Lower = more consistent

  // Ranking positions (how often ranked 1st, 2nd, etc)
  stats.ranking_frequency = {};
  allReceived.forEach(position => {
    stats.ranking_frequency[position] = (stats.ranking_frequency[position] || 0) + 1;
  });

  return stats;
}

/**
 * Build preference matrix showing disagreement patterns
 */
function buildPreferenceMatrix(conversations, models) {
  const matrix = {};

  // Initialize matrix
  models.forEach(model1 => {
    matrix[model1] = {};
    models.forEach(model2 => {
      matrix[model1][model2] = [];
    });
  });

  // Populate with ranking data
  conversations.forEach(conv => {
    conv.messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.stage2 && msg.metadata) {
        msg.stage2.forEach(ranking => {
          const evaluator = ranking.model;
          if (ranking.parsed_ranking && evaluator) {
            ranking.parsed_ranking.forEach((label, position) => {
              const targetModel = msg.metadata.label_to_model[label.trim()];
              if (targetModel && models.includes(evaluator) && models.includes(targetModel)) {
                matrix[evaluator][targetModel].push(position + 1);
              }
            });
          }
        });
      }
    });
  });

  // Calculate average ranks
  const avgMatrix = {};
  Object.entries(matrix).forEach(([evaluator, targets]) => {
    avgMatrix[evaluator] = {};
    Object.entries(targets).forEach(([target, positions]) => {
      avgMatrix[evaluator][target] = positions.length > 0 ? calculateMean(positions) : null;
    });
  });

  return avgMatrix;
}

/**
 * Calculate disagreement score for a specific question/conversation
 */
function calculateControversyScore(stage2Rankings, labelToModel) {
  if (!stage2Rankings || stage2Rankings.length < 2) return 0;

  const labels = Object.keys(labelToModel);
  const models = Object.values(labelToModel);
  const positionMatrix = {};

  models.forEach(model => {
    positionMatrix[model] = [];
  });

  stage2Rankings.forEach(ranking => {
    const parsed = ranking.parsed_ranking || [];
    parsed.forEach((label, position) => {
      const modelName = labelToModel[label.trim()];
      if (modelName) {
        positionMatrix[modelName].push(position + 1);
      }
    });
  });

  const stdDevs = [];
  Object.values(positionMatrix).forEach(positions => {
    if (positions.length > 0) {
      const mean = calculateMean(positions);
      const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
      stdDevs.push(Math.sqrt(variance));
    }
  });

  const avgStdDev = calculateMean(stdDevs);
  const maxPossibleStdDev = (labels.length - 1) / Math.sqrt(12);
  return Math.min(100, Math.round((avgStdDev / maxPossibleStdDev) * 100));
}

/**
 * Extract all unique models from conversations
 */
function extractAllModels(conversations) {
  const models = new Set();

  conversations.forEach(conv => {
    conv.messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.stage1) {
        msg.stage1.forEach(response => {
          if (response.model) models.add(response.model);
        });
      }
    });
  });

  return Array.from(models).sort();
}

/**
 * Helper: Calculate mean of array
 */
function calculateMean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Helper: Calculate variance of array
 */
function calculateVariance(arr) {
  if (arr.length <= 1) return 0;
  const mean = calculateMean(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length);
}

/**
 * Calculate personality insights for all models
 */
export function calculatePersonalityProfiles(conversations) {
  if (!conversations || conversations.length === 0) {
    return { profiles: {}, models: [], matrix: {}, summary: null };
  }

  const allModels = extractAllModels(conversations);
  const profiles = {};

  allModels.forEach(model => {
    profiles[model] = calculateModelPersonality(model, conversations);
  });

  const matrix = buildPreferenceMatrix(conversations, allModels);

  // Create summary statistics
  const summary = {
    total_conversations: conversations.length,
    total_models: allModels.length,
    models: allModels,
    generated_at: new Date().toISOString()
  };

  return { profiles, models: allModels, matrix, summary };
}

/**
 * Get controversy scores across all conversations
 */
export function getControversyScores(conversations) {
  const scores = conversations.map((conv, index) => {
    let maxControversy = 0;

    conv.messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.stage2 && msg.metadata) {
        const score = calculateControversyScore(msg.stage2, msg.metadata.label_to_model);
        maxControversy = Math.max(maxControversy, score);
      }
    });

    return {
      conversationId: conv.id,
      title: conv.title,
      created_at: conv.created_at,
      controversyScore: maxControversy
    };
  });

  return scores.sort((a, b) => b.controversyScore - a.controversyScore);
}

export { calculateMean, calculateVariance };

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage2.css';

function deAnonymizeText(text, labelToModel) {
  if (!labelToModel) return text;

  let result = text;
  // Replace each "Response X" with both the anonymous label and actual model name
  // Format: Response A (claude-sonnet-4.5)
  Object.entries(labelToModel).forEach(([label, model]) => {
    const modelShortName = model.split('/')[1] || model;
    // Replace with format: Response X (**model-name**)
    // This shows both the anonymous label used in evaluation and the actual model
    result = result.replace(
      new RegExp(`\\b${label}\\b`, 'g'),
      `${label} (**${modelShortName}**)`
    );
  });
  return result;
}

function calculateControversyMetrics(rankings, labelToModel) {
  if (!rankings || rankings.length < 2) return null;

  // Build a matrix of rankings
  const labels = Object.keys(labelToModel);
  const models = Object.values(labelToModel);

  // Create position matrix: for each model, track what position it received from each evaluator
  const positionMatrix = {};
  models.forEach(model => {
    positionMatrix[model] = [];
  });

  // Fill the matrix
  rankings.forEach(ranking => {
    const parsed = ranking.parsed_ranking || [];
    parsed.forEach((label, position) => {
      const modelName = labelToModel[label.trim()];
      if (modelName) {
        positionMatrix[modelName].push(position + 1); // 1-indexed
      }
    });
  });

  // Calculate variance/std dev for each model
  const stats = {};
  Object.entries(positionMatrix).forEach(([model, positions]) => {
    if (positions.length > 0) {
      const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
      const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - mean, 2), 0) / positions.length;
      const stdDev = Math.sqrt(variance);
      stats[model] = { mean, variance, stdDev, positions };
    }
  });

  // Calculate overall controversy score (0-100)
  // Higher variance = more disagreement = higher controversy
  const stdDevs = Object.values(stats).map(s => s.stdDev);
  const avgStdDev = stdDevs.reduce((a, b) => a + b, 0) / stdDevs.length;
  const maxPossibleStdDev = (labels.length - 1) / Math.sqrt(12); // Max std dev for uniform distribution
  const controversyScore = Math.min(100, Math.round((avgStdDev / maxPossibleStdDev) * 100));

  return {
    controversyScore,
    stats,
    positionMatrix,
    labels
  };
}

function getControversyLevel(score) {
  if (score < 20) return { level: 'Strong Consensus', color: '#2ecc71' };
  if (score < 40) return { level: 'General Agreement', color: '#3498db' };
  if (score < 60) return { level: 'Mixed Opinions', color: '#f39c12' };
  if (score < 80) return { level: 'High Disagreement', color: '#e74c3c' };
  return { level: 'Maximum Disagreement', color: '#c0392b' };
}

function extractReasoningHighlights(ranking, labelToModel) {
  const text = ranking.ranking || '';
  const parsed = ranking.parsed_ranking || [];

  if (parsed.length === 0) return null;

  // Get the top-ranked response
  const topLabel = parsed[0];
  const topModel = labelToModel?.[topLabel.trim()];

  // Extract sentences mentioning the top response
  const topResponsePattern = new RegExp(`Response\\s+${topLabel.match(/[A-Z]$/)?.[0] || 'A'}[\\s:,\\.]*([^.!?]*[.!?])`, 'gi');
  const topResponseMatches = text.match(topResponsePattern) || [];

  // Extract positive keywords (strengths)
  const positiveKeywords = ['excellent', 'comprehensive', 'thorough', 'accurate', 'clear', 'detailed', 'well-reasoned', 'insightful', 'thoughtful', 'good', 'strong', 'best'];
  const positiveMatches = [];
  positiveKeywords.forEach(keyword => {
    const regex = new RegExp(`[^.]*\\b${keyword}\\b[^.]*[.!?]`, 'gi');
    const matches = text.match(regex) || [];
    matches.slice(0, 2).forEach(m => positiveMatches.push(m.trim()));
  });

  // Extract negative keywords (weaknesses)
  const negativeKeywords = ['lacking', 'unclear', 'incomplete', 'vague', 'missing', 'weak', 'superficial', 'verbose', 'confusing', 'inaccurate', 'poor'];
  const negativeMatches = [];
  negativeKeywords.forEach(keyword => {
    const regex = new RegExp(`[^.]*\\b${keyword}\\b[^.]*[.!?]`, 'gi');
    const matches = text.match(regex) || [];
    matches.slice(0, 2).forEach(m => negativeMatches.push(m.trim()));
  });

  return {
    topModel,
    topLabel: topLabel.trim(),
    positive: [...new Set(positiveMatches)].slice(0, 3),
    negative: [...new Set(negativeMatches)].slice(0, 3)
  };
}

export default function Stage2({ rankings, labelToModel, aggregateRankings }) {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedMetrics, setExpandedMetrics] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState({});
  const [expandedVerification, setExpandedVerification] = useState(false);
  const controversyMetrics = calculateControversyMetrics(rankings, labelToModel);

  if (!rankings || rankings.length === 0) {
    return null;
  }

  return (
    <div className="stage stage2">
      <h3 className="stage-title">Stage 2: Peer Rankings</h3>

      {controversyMetrics && (
        <div className="controversy-score">
          <div className="controversy-header">
            <span className="controversy-label">Controversy Score:</span>
            <div className="controversy-bar">
              <div
                className="controversy-fill"
                style={{
                  width: `${controversyMetrics.controversyScore}%`,
                  backgroundColor: getControversyLevel(controversyMetrics.controversyScore).color
                }}
              />
            </div>
            <span className="controversy-number">{controversyMetrics.controversyScore}%</span>
          </div>
          <div className="controversy-level">
            <span className="level-text">
              {getControversyLevel(controversyMetrics.controversyScore).level}
            </span>
            <button
              className="expand-button"
              onClick={() => setExpandedMetrics(!expandedMetrics)}
            >
              {expandedMetrics ? '▼' : '▶'}
            </button>
          </div>

          {expandedMetrics && (
            <div className="controversy-details">
              <p>
                {controversyMetrics.controversyScore < 30 &&
                  "Models strongly agree on response quality. Consider this a high-confidence assessment."}
                {controversyMetrics.controversyScore >= 30 && controversyMetrics.controversyScore < 70 &&
                  "Models have varying opinions on response quality. Different perspectives present—weigh carefully."}
                {controversyMetrics.controversyScore >= 70 &&
                  "Significant disagreement among models. This question may be context-dependent or have multiple valid approaches."}
              </p>
              <div className="controversy-variance-table">
                {Object.entries(controversyMetrics.stats)
                  .sort((a, b) => b[1].stdDev - a[1].stdDev)
                  .map(([model, stat]) => (
                    <div key={model} className="variance-row">
                      <span className="variance-model">{model.split('/')[1] || model}</span>
                      <span className="variance-stat">
                        avg rank: {stat.mean.toFixed(1)}, variance: {stat.stdDev.toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <h4>Anonymization Mapping</h4>
      <p className="stage-description">
        During evaluation, models ranked responses using only these anonymous labels:
      </p>
      {labelToModel && (
        <div className="anonymization-mapping">
          <table className="mapping-table">
            <thead>
              <tr>
                <th>Anonymous Label</th>
                <th>Actual Model</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(labelToModel).map(([label, model]) => (
                <tr key={label}>
                  <td className="label-cell">{label}</td>
                  <td className="model-cell">{model}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="anonymization-note">
            ⚠️ <strong>Verification:</strong> Models evaluated using only the anonymous labels above—they did not know which model produced which response.
          </div>
        </div>
      )}

      <div className="anonymization-verification">
        <button
          className="verification-button"
          onClick={() => setExpandedVerification(!expandedVerification)}
        >
          <span className="verification-icon">{expandedVerification ? '▼' : '▶'}</span>
          How Does Anonymization Work?
        </button>

        {expandedVerification && (
          <div className="verification-content">
            <div className="verification-item">
              <h5>What Models See (During Evaluation)</h5>
              <p>
                Models only see "Response A", "Response B", etc. They receive <strong>no information</strong> about which model produced each response. The ranking decision is made purely on content quality.
              </p>
            </div>

            <div className="verification-item">
              <h5>What You See (After Evaluation)</h5>
              <p>
                The mapping above shows you which anonymous label corresponds to which model, allowing you to trace the results. This transparency happens <strong>after</strong> the evaluation is complete.
              </p>
            </div>

            <div className="verification-item">
              <h5>Why This Matters</h5>
              <p>
                Without anonymization, models might rank based on reputation or bias toward certain model names. Anonymization ensures rankings are based purely on response quality.
              </p>
            </div>

            <div className="verification-item">
              <h5>Verifying the Anonymization</h5>
              <ol>
                <li>Check the mapping table above to see which Response = which model</li>
                <li>Read the evaluations below and note which Response was ranked highest</li>
                <li>Cross-reference the mapping to see which model ranked best</li>
                <li>The evaluation text shows model names for readability, but the ranking decision was made using only anonymous labels</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Below, the evaluation text shows model names for readability, but the ranking decision was made using only the anonymous labels above.
      </p>

      <div className="tabs">
        {rankings.map((rank, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {rank.model.split('/')[1] || rank.model}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="ranking-model">
          {rankings[activeTab].model}
        </div>
        <div className="ranking-content markdown-content">
          <ReactMarkdown>
            {deAnonymizeText(rankings[activeTab].ranking, labelToModel)}
          </ReactMarkdown>
        </div>

        {rankings[activeTab].parsed_ranking &&
         rankings[activeTab].parsed_ranking.length > 0 && (
          <div className="parsed-ranking">
            <strong>Extracted Ranking:</strong>
            <ol>
              {rankings[activeTab].parsed_ranking.map((label, i) => {
                // Normalize the label format
                const normalizedLabel = label.trim();
                const modelName = labelToModel && labelToModel[normalizedLabel];

                return (
                  <li key={i}>
                    {modelName
                      ? modelName.split('/')[1] || modelName
                      : normalizedLabel}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {(() => {
          const reasoning = extractReasoningHighlights(rankings[activeTab], labelToModel);
          const tabId = `reasoning-${activeTab}`;
          const isExpanded = expandedReasoning[tabId];

          return reasoning && (reasoning.positive.length > 0 || reasoning.negative.length > 0) ? (
            <div className="reasoning-highlights">
              <button
                className="reasoning-button"
                onClick={() => setExpandedReasoning(prev => ({
                  ...prev,
                  [tabId]: !isExpanded
                }))}
              >
                <span className="reasoning-icon">{isExpanded ? '▼' : '▶'}</span>
                Why This Ranking?
              </button>

              {isExpanded && (
                <div className="reasoning-content">
                  {reasoning.positive.length > 0 && (
                    <div className="reasoning-section">
                      <div className="reasoning-label positive">✓ Strengths</div>
                      <ul className="reasoning-list">
                        {reasoning.positive.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reasoning.negative.length > 0 && (
                    <div className="reasoning-section">
                      <div className="reasoning-label negative">✗ Weaknesses</div>
                      <ul className="reasoning-list">
                        {reasoning.negative.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null;
        })()}
      </div>

      {aggregateRankings && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">
                  {agg.model.split('/')[1] || agg.model}
                </span>
                <span className="rank-score">
                  Avg: {agg.average_rank.toFixed(2)}
                </span>
                <span className="rank-count">
                  ({agg.rankings_count} votes)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { calculatePersonalityProfiles, getControversyScores } from '../utils/analytics';
import './PersonalityProfiles.css';

export default function PersonalityProfiles({ conversations }) {
  const [expandedModels, setExpandedModels] = useState({});
  const [sortBy, setSortBy] = useState('consistency'); // consistency, harshness, generosity, consensus
  const analytics = calculatePersonalityProfiles(conversations);

  if (!analytics.summary || analytics.summary.total_conversations < 3) {
    return (
      <div className="personality-empty">
        <h3>Model Personality Profiles</h3>
        <p>Need at least 3 conversations to build personality profiles.</p>
        <p>Current: {analytics.summary?.total_conversations || 0} conversations</p>
      </div>
    );
  }

  const { profiles, models, matrix, summary } = analytics;

  // Sort models by selected criteria
  const sortedModels = [...models].sort((a, b) => {
    const profileA = profiles[a];
    const profileB = profiles[b];

    switch (sortBy) {
      case 'consistency':
        return profileA.consistency - profileB.consistency; // Lower variance = more consistent
      case 'harshness':
        const avgHarshnessA = Object.values(profileA.givenRankings || {}).reduce((sum, r) => sum + (r.avgRank || 0), 0) / Object.keys(profileA.givenRankings || {}).length;
        const avgHarshnessB = Object.values(profileB.givenRankings || {}).reduce((sum, r) => sum + (r.avgRank || 0), 0) / Object.keys(profileB.givenRankings || {}).length;
        return avgHarshnessA - avgHarshnessB;
      case 'generosity':
        const avgGenA = Object.values(profileA.givenRankings || {}).reduce((sum, r) => sum + (r.avgRank || 0), 0) / Object.keys(profileA.givenRankings || {}).length;
        const avgGenB = Object.values(profileB.givenRankings || {}).reduce((sum, r) => sum + (r.avgRank || 0), 0) / Object.keys(profileB.givenRankings || {}).length;
        return avgGenB - avgGenA;
      case 'consensus':
        return (profileA.average_rank_received || 0) - (profileB.average_rank_received || 0);
      default:
        return 0;
    }
  });

  const toggleModel = (model) => {
    setExpandedModels(prev => ({
      ...prev,
      [model]: !prev[model]
    }));
  };

  const getPersonalityTraits = (profile) => {
    const traits = [];

    // Self-assessment tendency
    if (profile.self_assessment < 1.5) {
      traits.push({ type: 'confidence', label: 'Overly Confident', color: '#e74c3c' });
    } else if (profile.self_assessment < 2.2) {
      traits.push({ type: 'confidence', label: 'Moderately Confident', color: '#f39c12' });
    } else {
      traits.push({ type: 'confidence', label: 'Modest', color: '#3498db' });
    }

    // Consistency
    if (profile.consistency < 0.5) {
      traits.push({ type: 'consistency', label: 'Very Consistent', color: '#2ecc71' });
    } else if (profile.consistency < 1.0) {
      traits.push({ type: 'consistency', label: 'Generally Consistent', color: '#3498db' });
    } else {
      traits.push({ type: 'consistency', label: 'Varies', color: '#e74c3c' });
    }

    // Harshness
    const avgHarshness = Object.values(profile.givenRankings || {}).reduce((sum, r) => sum + (r.avgRank || 0), 0) / Math.max(1, Object.keys(profile.givenRankings || {}).length);
    if (avgHarshness < 2.2) {
      traits.push({ type: 'harshness', label: 'Critical', color: '#e74c3c' });
    } else if (avgHarshness < 2.8) {
      traits.push({ type: 'harshness', label: 'Balanced', color: '#3498db' });
    } else {
      traits.push({ type: 'harshness', label: 'Generous', color: '#2ecc71' });
    }

    return traits;
  };

  const controversyScores = getControversyScores(conversations);
  const mostControversial = controversyScores[0];

  return (
    <div className="personality-profiles">
      <div className="profiles-header">
        <h3>🧬 Model Personality Profiles</h3>
        <p className="profiles-subtitle">Based on {summary.total_conversations} conversations</p>
      </div>

      <div className="profiles-summary">
        <div className="summary-card">
          <div className="summary-stat">
            <span className="stat-label">Total Models Analyzed</span>
            <span className="stat-value">{summary.total_models}</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-stat">
            <span className="stat-label">Most Controversial Question</span>
            <span className="stat-value">{mostControversial?.controversyScore}%</span>
            <span className="stat-detail">{mostControversial?.title}</span>
          </div>
        </div>
      </div>

      <div className="sort-controls">
        <span className="sort-label">Sort by:</span>
        {['consistency', 'consensus', 'harshness'].map(option => (
          <button
            key={option}
            className={`sort-button ${sortBy === option ? 'active' : ''}`}
            onClick={() => setSortBy(option)}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      <div className="profiles-list">
        {sortedModels.map(modelName => {
          const profile = profiles[modelName];
          const traits = getPersonalityTraits(profile);
          const isExpanded = expandedModels[modelName];

          return (
            <div key={modelName} className="profile-card">
              <button
                className="profile-header-button"
                onClick={() => toggleModel(modelName)}
              >
                <span className="profile-name">
                  {modelName.split('/')[1] || modelName}
                </span>
                <span className="profile-icon">{isExpanded ? '▼' : '▶'}</span>
              </button>

              <div className="profile-traits">
                {traits.map((trait, i) => (
                  <span
                    key={i}
                    className="trait-badge"
                    style={{ backgroundColor: trait.color }}
                  >
                    {trait.label}
                  </span>
                ))}
              </div>

              {isExpanded && (
                <div className="profile-details">
                  <div className="profile-section">
                    <h4>Ranking Behavior</h4>
                    <div className="detail-row">
                      <span className="detail-label">Self-Assessment:</span>
                      <span className="detail-value">
                        #{profile.self_assessment?.toFixed(1) || '—'} avg position ({profile.self_assessment_count} rankings)
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Consensus Grade:</span>
                      <span className="detail-value">
                        {profile.average_rank_received?.toFixed(2) || '—'} (lower = more respected)
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Consistency Score:</span>
                      <span className="detail-value">
                        {(100 - Math.min(100, profile.consistency * 100))?.toFixed(0)}% (σ = {profile.consistency?.toFixed(2)})
                      </span>
                    </div>
                  </div>

                  <div className="profile-section">
                    <h4>Ranking Tendencies</h4>
                    <div className="harshness-chart">
                      {Object.entries(profile.givenRankings || {})
                        .sort((a, b) => a[1].avgRank - b[1].avgRank)
                        .slice(0, 4)
                        .map(([target, stat]) => (
                          <div key={target} className="chart-row">
                            <span className="chart-label">
                              {target.split('/')[1] || target}
                            </span>
                            <div className="chart-bar">
                              <div
                                className="chart-fill"
                                style={{
                                  width: `${(stat.avgRank / 4) * 100}%`,
                                  backgroundColor: stat.avgRank < 2 ? '#2ecc71' : stat.avgRank < 3 ? '#f39c12' : '#e74c3c'
                                }}
                              />
                            </div>
                            <span className="chart-value">
                              #{stat.avgRank.toFixed(1)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="profile-section">
                    <h4>Track Record</h4>
                    <div className="track-record">
                      {Object.entries(profile.ranking_frequency || {})
                        .map(([position, count]) => (
                          <div key={position} className="record-item">
                            <span className="position">#{position}</span>
                            <span className="count">{count}x</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="profile-section">
                    <h4>Pairwise Comparisons</h4>
                    <div className="pairwise-table">
                      {Object.entries(profile.givenRankings || {})
                        .slice(0, 3)
                        .map(([target, stat]) => (
                          <div key={target} className="pairwise-row">
                            <span className="pairwise-label">
                              Ranks {target.split('/')[1] || target}:
                            </span>
                            <span className="pairwise-value">
                              {stat.avgRank.toFixed(1)} avg over {stat.count} evaluations
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="profiles-footer">
        <p className="footer-text">
          Personality profiles are computed from peer rankings across all conversations.
          More conversations = better accuracy of personality estimates.
        </p>
      </div>
    </div>
  );
}

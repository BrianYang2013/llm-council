import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage1.css';

function extractTLDR(text) {
  // Look for explicit TL;DR format
  const tldrMatch = text.match(/TL;?DR:?\s*(.+?)(?:\n|$)/i);
  if (tldrMatch) {
    return tldrMatch[1].trim();
  }

  // Extract first meaningful sentence (heuristic)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    let summary = sentences[0].trim();
    // Limit to 140 characters for readability
    if (summary.length > 140) {
      summary = summary.substring(0, 137) + '...';
    }
    return summary;
  }

  return 'Response provided';
}

export default function Stage1({ responses }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!responses || responses.length === 0) {
    return null;
  }

  // Generate the anonymous labels for Stage 2
  const getAnonymousLabel = (index) => {
    return `Response ${String.fromCharCode(65 + index)}`;
  };

  return (
    <div className="stage stage1">
      <h3 className="stage-title">Stage 1: Individual Responses</h3>

      <div className="stage1-info-banner">
        <span className="info-icon">ℹ️</span>
        <span className="info-text">
          These responses are below are presented here with model names visible. In Stage 2, models will evaluate them anonymously as <strong>Response A, B, C, D</strong> etc. (see mapping in Stage 2 for the label assignments).
        </span>
      </div>

      <div className="stage1-tabs-container">
        <div className="tabs">
          {responses.map((resp, index) => (
            <button
              key={index}
              className={`tab ${activeTab === index ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
              title={`This will be evaluated as ${getAnonymousLabel(index)} in Stage 2`}
            >
              {resp.model.split('/')[1] || resp.model}
              <span className="response-label">{getAnonymousLabel(index)}</span>
            </button>
          ))}
        </div>
        <div className="stage1-summaries">
          {responses.map((resp, index) => (
            <div key={index} className="summary-item">
              <span className="summary-model">
                {resp.model.split('/')[1] || resp.model}
              </span>
              <span className="summary-text">
                {extractTLDR(resp.response)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="tab-content">
        <div className="model-name">{responses[activeTab].model}</div>
        <div className="response-text markdown-content">
          <ReactMarkdown>{responses[activeTab].response}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

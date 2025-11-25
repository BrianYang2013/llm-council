/**
 * Export utilities for Decision Journal and other formats
 */

/**
 * Export a conversation to markdown format for Decision Journal
 */
export function exportToMarkdown(conversation) {
  if (!conversation || !conversation.messages) {
    return '';
  }

  let markdown = '';
  const createdDate = new Date(conversation.created_at).toLocaleDateString();
  markdown += `# Decision: ${conversation.title}\n\n`;
  markdown += `**Date**: ${createdDate}\n`;
  markdown += `**Conversation ID**: ${conversation.id}\n\n`;

  // Find initial user question
  const userMessages = conversation.messages.filter(m => m.role === 'user');
  const assistantMessages = conversation.messages.filter(m => m.role === 'assistant');

  if (userMessages.length > 0) {
    markdown += `## The Question\n\n${userMessages[0].content}\n\n`;
  }

  // Add each Q&A pair
  userMessages.forEach((userMsg, index) => {
    if (index > 0) {
      markdown += `## Follow-up Question ${index}\n\n${userMsg.content}\n\n`;
    }

    // Find corresponding assistant message
    const assistantMsg = assistantMessages[index];
    if (assistantMsg) {
      markdown += `### Stage 1: Individual Perspectives\n\n`;

      // Add Stage 1 responses
      if (assistantMsg.stage1 && assistantMsg.stage1.length > 0) {
        assistantMsg.stage1.forEach(response => {
          const modelName = response.model.split('/')[1] || response.model;
          markdown += `#### ${modelName}\n\n`;
          markdown += `${response.response}\n\n`;
        });
      }

      // Add consensus score
      if (assistantMsg.metadata && assistantMsg.metadata.aggregate_rankings) {
        const topRanked = assistantMsg.metadata.aggregate_rankings[0];
        markdown += `### Model Consensus\n\n`;
        markdown += `Most supported perspective: **${topRanked.model.split('/')[1]}** (avg rank: ${topRanked.average_rank.toFixed(2)})\n\n`;
      }

      // Add Stage 3 final synthesis
      if (assistantMsg.stage3) {
        markdown += `### Final Recommendation\n\n`;
        markdown += `${assistantMsg.stage3.response}\n\n`;
      }

      markdown += `---\n\n`;
    }
  });

  markdown += `## Export Notes\n\n`;
  markdown += `- This decision was reviewed by multiple AI models\n`;
  markdown += `- Review the full conversation to see peer evaluations and reasoning\n`;
  markdown += `- Exported from LLM Council\n`;

  return markdown;
}

/**
 * Export to CSV for data analysis
 */
export function exportToCSV(conversations) {
  if (!conversations || conversations.length === 0) {
    return '';
  }

  const headers = [
    'Conversation',
    'Date',
    'Question',
    'Model',
    'Response Length',
    'Avg Rank',
  ];

  let csv = headers.join(',') + '\n';

  conversations.forEach(conv => {
    const date = new Date(conv.created_at).toISOString().split('T')[0];
    const question = conv.messages[0]?.content || 'Unknown';

    conv.messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.stage1) {
        msg.stage1.forEach(response => {
          const avgRank = msg.metadata?.aggregate_rankings?.find(
            r => r.model === response.model
          )?.average_rank || 'N/A';

          csv += `"${conv.title}","${date}","${question.substring(0, 50)}...","${response.model}",${response.response.length},"${avgRank}"\n`;
        });
      }
    });
  });

  return csv;
}

/**
 * Trigger file download in browser
 */
export function downloadFile(filename, content, mimeType = 'text/plain') {
  const element = document.createElement('a');
  element.setAttribute('href', `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`);
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

/**
 * Export conversation decision journal
 */
export function exportDecisionJournal(conversation) {
  const markdown = exportToMarkdown(conversation);
  const filename = `decision-${conversation.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.md`;
  downloadFile(filename, markdown, 'text/markdown');
}

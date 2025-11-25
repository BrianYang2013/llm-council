# LLM Council

![llmcouncil](header.jpg)

The idea of this repo is that instead of asking a question to your favorite LLM provider (e.g. OpenAI GPT 5.1, Google Gemini 3.0 Pro, Anthropic Claude Sonnet 4.5, xAI Grok 4, eg.c), you can group them into your "LLM Council". This repo is a simple, local web app that essentially looks like ChatGPT except it uses OpenRouter to send your query to multiple LLMs, it then asks them to review and rank each other's work, and finally a Chairman LLM produces the final response.

In a bit more detail, here is what happens when you submit a query:

1. **Stage 1: First opinions**. The user query is given to all LLMs individually, and the responses are collected. The individual responses are shown in a "tab view", so that the user can inspect them all one by one.
2. **Stage 2: Review**. Each individual LLM is given the responses of the other LLMs. Under the hood, the LLM identities are anonymized so that the LLM can't play favorites when judging their outputs. The LLM is asked to rank them in accuracy and insight.
3. **Stage 3: Final response**. The designated Chairman of the LLM Council takes all of the model's responses and compiles them into a single final answer that is presented to the user.

## Vibe Code Alert

This project was 99% vibe coded as a fun Saturday hack because I wanted to explore and evaluate a number of LLMs side by side in the process of [reading books together with LLMs](https://x.com/karpathy/status/1990577951671509438). It's nice and useful to see multiple responses side by side, and also the cross-opinions of all LLMs on each other's outputs. I'm not going to support it in any way, it's provided here as is for other people's inspiration and I don't intend to improve it. Code is ephemeral now and libraries are over, ask your LLM to change it in whatever way you like.

## Setup

### 1. Install Dependencies

The project uses [uv](https://docs.astral.sh/uv/) for project management.

**Backend:**
```bash
uv sync
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Configure API Key

Create a `.env` file in the project root:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

Get your API key at [openrouter.ai](https://openrouter.ai/). Make sure to purchase the credits you need, or sign up for automatic top up.

### 3. Configure Models (Optional)

Edit `backend/config.py` to customize the council:

```python
COUNCIL_MODELS = [
    "openai/gpt-5.1",
    "google/gemini-3-pro-preview",
    "anthropic/claude-sonnet-4.5",
    "x-ai/grok-4",
]

CHAIRMAN_MODEL = "google/gemini-3-pro-preview"
```

## Running the Application

**Option 1: Use the start script**
```bash
./start.sh
```

**Option 2: Run manually**

Terminal 1 (Backend):
```bash
uv run python -m backend.main
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## Features

### Core Deliberation System
- **Stage 1: Individual Responses** - All council members answer the question in parallel
- **Stage 2: Anonymous Peer Review** - Models rank each other's responses without knowing identities
- **Stage 3: Final Synthesis** - Chairman integrates all perspectives into one comprehensive answer

### Advanced Analytics & Insights
- **Disagreement Heatmap** - Visual controversy score showing consensus level (0-100%)
- **Model Personality Profiles** - Understand each model's ranking behavior, consistency, and tendencies
- **"Why This Ranking?" Expanders** - Click to see extracted strengths and weaknesses per evaluation
- **TL;DR Summaries** - Quick one-line summaries of each model's response in Stage 1

### Transparency & Trust
- **Anonymization Mapping Table** - See exactly which anonymous label (Response A/B/C) maps to which model
- **Hybrid Labels** - Evaluations show both anonymous label and model name (e.g., "Response B (claude-sonnet-4.5)")
- **Anonymization Verification** - Expandable section explaining how anonymization works and how to verify it
- **Stage 1 Indicators** - See which response becomes which anonymous label in Stage 2

### Decision Management
- **Export to Decision Journal** - Download conversations as markdown for record-keeping
- **Conversation History** - Browse and revisit past council deliberations

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), async httpx, OpenRouter API
- **Frontend:** React + Vite, react-markdown for rendering
- **Analytics:** Custom personality profile calculation from ranking data
- **Storage:** JSON files in `data/conversations/`
- **Package Management:** uv for Python, npm for JavaScript

## Changelog

### v2.0.0 - Analytics & Transparency Update (2025-11-24)

#### Major Features
- **Model Personality Profiles** - Analytics dashboard showing:
  - Ranking behavior (critical vs generous)
  - Self-assessment tendencies
  - Consistency scores
  - Track record (how often ranked 1st, 2nd, etc.)
  - Pairwise comparison with other models
  - Personality trait badges (confident/modest, consistent/variable, critical/generous)
  - Sortable by consistency, consensus, or harshness

- **Anonymization Transparency System** - Build user trust through:
  - Anonymization mapping table in Stage 2 showing Response A/B/C = model names
  - Hybrid labels in evaluation text showing both anonymous label and real model
  - "How Does Anonymization Work?" expandable verification section with:
    - What models see vs what users see
    - Why anonymization matters
    - Step-by-step verification guide
  - Stage 1 info banner and response labels showing future anonymous labels

- **Disagreement Heatmap** - Visual controversy scoring:
  - Color-coded scale (green=consensus → red=disagreement)
  - Per-model variance statistics
  - Context-aware interpretation of disagreement levels
  - Expandable details showing which models disagree most

- **"Why This Ranking?" Expanders** - Reasoning highlights:
  - Extract positive keywords (strengths) from evaluations
  - Extract negative keywords (weaknesses) from evaluations
  - Collapsible UI showing strength/weakness summaries
  - Helps understand evaluation rationale without reading full text

- **TL;DR One-Line Summaries** - Quick reference for Stage 1:
  - Automatic extraction of first meaningful sentence
  - Explicit TL;DR detection from response text
  - Grid layout showing all summaries at a glance
  - 140 character limit for readability

- **Export to Decision Journal** - Record keeping:
  - Export individual conversations as markdown files
  - Includes all stages and consensus metrics
  - Auto-generated filename with conversation title and timestamp

- **Analytics View** - New dedicated analytics dashboard:
  - 💬 Chat / 🧬 Analytics toggle in sidebar
  - Parallel loading of full conversation data
  - Loading spinner with status feedback
  - Summary statistics: total models analyzed, most controversial question
  - Model sorting by consistency, consensus, or harshness

#### Enhancements
- Analytics data layer (`frontend/src/utils/analytics.js`):
  - Calculate per-model personality metrics from conversation history
  - Build preference matrices showing inter-model relationships
  - Extract controversy scores across all conversations
  - Retroactively analyze historical conversation data

- Chat interface improvements:
  - Chat header with conversation title
  - Export button for decision journal functionality
  - Green-tinted export button with intuitive styling

- Stage 2 improvements:
  - Anonymization mapping table with clear headers
  - Verification note explaining anonymization integrity
  - Expandable verification button with educational content
  - Better description text about model names in evaluations

- Stage 1 improvements:
  - Info banner explaining anonymization process
  - Response label badges on tabs showing future anonymous labels
  - Tooltip on tabs explaining stage 2 mapping
  - Improved visual hierarchy

#### Bug Fixes
- Fixed Analytics blank page by implementing lazy loading of full conversation data
- Proper error handling for failed conversation loads
- Graceful degradation when partial conversation data unavailable

#### Technical Details
- No backend changes required (uses existing API endpoints)
- Frontend-only analytics computation (no schema changes)
- Parallel API requests for efficient data loading
- Lazy loading: analytics data only loaded when view is accessed
- Caching: avoids reloading if full data already present

### v1.0.0 - Initial Release
- Core 3-stage deliberation system
- Anonymous peer review implementation
- Individual response collection (Stage 1)
- Peer ranking with anonymization (Stage 2)
- Chairman synthesis (Stage 3)
- JSON-based conversation storage
- React frontend with tab-based UI
- FastAPI backend with async streaming
- OpenRouter API integration

## Usage Tips

### Verifying Anonymization
1. Check the **Anonymization Mapping** table in Stage 2
2. Note which Response was ranked highest in the evaluations
3. Cross-reference the mapping to see which model performed best
4. Read the "How Does Anonymization Work?" section for detailed explanation

### Understanding Model Personalities
1. Run at least 3 conversations to activate Analytics
2. Click the 🧬 Analytics button in the sidebar
3. Sort by consistency to find most reliable models
4. Sort by consensus to see which models are respected by peers
5. Click on model cards to see detailed ranking behavior

### Making Important Decisions
1. Use the council to get multiple perspectives
2. Check the disagreement/controversy score
3. If high agreement: you can trust the consensus
4. If high disagreement: consider it a nuanced topic, weigh perspectives carefully
5. Export as Decision Journal for future reference

### Exporting Conversations
1. Run a council deliberation
2. Click the 📓 Export button in the chat header
3. Markdown file downloads with full conversation
4. Includes all stages and consensus metrics
5. Use in decision logs or share with team

# EduAgent 🎓

An agent-based AI pipeline that generates grade-appropriate educational content, reviews it for quality, and refines it if needed.

---

## How It Works

```
User Input → Generator Agent → Reviewer Agent → (Refiner) → UI Output
```

1. **Generator Agent** — creates an explanation + 3 MCQs for the given grade and topic
2. **Reviewer Agent** — checks for age-appropriateness, conceptual correctness, and MCQ quality
3. **Refiner** — if the review fails, the Generator reruns with the feedback embedded (one pass)

---

## Tech Stack

| Layer | Tool |
|---|---|
| Backend | Python + Flask |
| AI / Agents | LangChain + Groq (`llama-3.3-70b-versatile`) |
| Frontend | HTML, CSS, Vanilla JS |

---

## Project Structure

```
eklavya_agent/
├── app.py               # Flask app + both agents + pipeline logic
├── requirements.txt
├── .env                 # Your GROQ_API_KEY goes here
├── templates/
│   └── index.html
└── static/
    ├── style.css
    └── script.js
```

---

## Setup & Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Add your Groq API key
echo "GROQ_API_KEY=gsk_..." > .env

# 3. Run
python app.py
```

Open `http://localhost:7860` in your browser.

---

## Input / Output

**Input**
```json
{ "grade": 4, "topic": "Types of angles" }
```

**Generator Output**
```json
{
  "explanation": "...",
  "mcqs": [{ "question": "...", "options": ["A","B","C","D"], "answer": "B" }]
}
```

**Reviewer Output**
```json
{ "status": "pass | fail", "feedback": ["issue 1", "issue 2"] }
```

# EduAgent (Eklavya.me assessment)

An agent-based AI pipeline that generates grade-appropriate educational content, reviews it for quality, and refines it if needed.  
View the application: https://huggingface.co/spaces/achushri-07/EduAgent

---

## How It Works

```
User Input → Generator Agent → Reviewer Agent → (Refiner) → UI Output
```

1. **Generator Agent** — creates an explanation + 3 MCQs for the given grade and topic
2. **Reviewer Agent** — checks for age-appropriateness, conceptual correctness, and MCQ quality
3. **Refiner** — if the review fails, the Generator reruns with the feedback embedded (one pass)

---

## Screenshot

<img width="1345" height="576" alt="image" src="https://github.com/user-attachments/assets/5dba89f3-7fd1-42c2-ab63-4c33e73b9cb4" />

---

## Tech Stack

| Layer | Tool |
|---|---|
| Backend | Python + Flask |
| AI / Agents | LangChain + Groq (`llama-3.3-70b-versatile`) |
| Frontend | HTML, CSS, JS |

---

## Project Structure

```
EdyAgent/
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

---

Developed by: Achintya Srivastawa

import os
import json
import re
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

app = Flask(__name__)

load_dotenv()
os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY")

MODEL = "llama-3.3-70b-versatile"
llm = ChatGroq(model=MODEL)

# AGENT 1 — Generator Agent

class GeneratorAgent:
    """Generates draft educational content for a given grade and topic."""

    SYSTEM_PROMPT = (
        "You are an expert educational content creator. "
        "Your job is to generate age-appropriate educational content for school students. "
        "Always respond with valid JSON only — no markdown, no extra text. "
        "Match language complexity precisely to the grade level."
    )

    def run(self, grade: int, topic: str, feedback: list[str] | None = None) -> dict:
        """
        Input : grade (int), topic (str), optional reviewer feedback (list of strings)
        Output: { explanation: str, mcqs: [ {question, options, answer} ] }
        """
        feedback_block = ""
        if feedback:
            joined = "\n".join(f"- {f}" for f in feedback)
            feedback_block = (
                f"\n\nA previous version of this content was rejected. "
                f"Fix these issues:\n{joined}"
            )

        user_prompt = f"""Generate educational content for the following:

Grade: {grade}
Topic: {topic}{feedback_block}

Return a JSON object with this exact structure:
{{
  "explanation": "<grade-appropriate explanation of the topic>",
  "mcqs": [
    {{
      "question": "<question text>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "answer": "<correct option letter, e.g. B>"
    }}
  ]
}}

Requirements:
- Write 3 multiple-choice questions.
- Language must suit Grade {grade} students.
- Concepts must be factually correct.
- Each question must test only concepts introduced in the explanation.
- Return only the JSON object, nothing else."""

        messages = [
            SystemMessage(content=self.SYSTEM_PROMPT),
            HumanMessage(content=user_prompt)
        ]
        response = llm.invoke(messages)
        raw = response.content.strip()
        return self._parse(raw)

    def _parse(self, raw: str) -> dict:
        raw = re.sub(r"^```[a-z]*\n?", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()
        return json.loads(raw)

# AGENT 2 — Reviewer Agent

class ReviewerAgent:
    SYSTEM_PROMPT = (
        "You are a STRICT educational content reviewer. "
        "Your default assumption is that content has problems. "
        "You must FAIL content unless it is perfectly suitable for the specified grade. "
        "Grade 4 students are 9-10 years old. They cannot understand technical jargon, "
        "complex scientific terminology, or concepts beyond their curriculum. For the rest grades you yourself can figure that out. "
        "Always respond with valid JSON only — no markdown, no extra text."
    )

    def run(self, grade: int, topic: str, content: dict) -> dict:
        user_prompt = f"""You are reviewing educational content for Grade {grade} students (age {grade + 5} years old).

Content to review:
{json.dumps(content, indent=2)}

Check EACH of these strictly:

1. LANGUAGE: Would a Grade {grade} student (age {grade + 5}) understand EVERY word and sentence?
   - Flag any technical term a child this age would not know
   - Flag any sentence that is too long or complex

2. CONCEPTS: Are all facts correct? Are any concepts too advanced for Grade {grade}?

3. MCQ QUALITY: Does each question ONLY test what was explained above?
   - If a question uses a term not in the explanation, FAIL it

4. AGE APPROPRIATENESS: Is the content correct as far as age and grade are concerned. If not then fail it.

Return ONLY this JSON:
{{
  "status": "pass or fail",
  "feedback": ["specific issue 1", "specific issue 2"]
}}

Now this doesn't mean that you will always be a strict checker. If the generated output is good then don't return fail.

If status is pass, feedback must be an empty list.
If status is fail, feedback must list every specific problem found."""

        messages = [
            SystemMessage(content=self.SYSTEM_PROMPT),
            HumanMessage(content=user_prompt)
        ]
        response = llm.invoke(messages)
        raw = response.content.strip()
        return self._parse(raw)

    def _parse(self, raw: str) -> dict:
        raw = re.sub(r"^```[a-z]*\n?", "", raw).strip()
        raw = re.sub(r"```$", "", raw).strip()
        return json.loads(raw)

# Pipeline orchestrator

def run_pipeline(grade: int, topic: str) -> dict:
    generator = GeneratorAgent()
    reviewer = ReviewerAgent()

    # Step 1: Generate
    generated = generator.run(grade, topic)

    # Step 2: Review
    review = reviewer.run(grade, topic, generated)

    result = {
        "grade": grade,
        "topic": topic,
        "generated": generated,
        "review": review,
        "refined": None,
        "refined_review": None,
    }

    # Step 3: Refine once if review failed
    if review["status"] == "fail":
        refined = generator.run(grade, topic, feedback=review["feedback"])
        result["refined"] = refined
        result["refined_review"] = None

    return result

# Flask routes

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    grade = int(data.get("grade", 4))
    topic = str(data.get("topic", "")).strip()

    if not topic:
        return jsonify({"error": "Topic is required."}), 400
    if not (1 <= grade <= 12):
        return jsonify({"error": "Grade must be between 1 and 12."}), 400

    try:
        result = run_pipeline(grade, topic)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7860)
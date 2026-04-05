/* ═══════════════════════════════════════════
   EDUAGENT — script.js
   Controls pipeline UI flow
═══════════════════════════════════════════ */

const $ = id => document.getElementById(id);

// Elements
const runBtn        = $("run-btn");
const gradeInput    = $("grade-input");
const topicInput    = $("topic-input");
const pipeline      = $("pipeline");
const loader        = $("loader");
const loaderText    = $("loader-text");
const errorBanner   = $("error-banner");
const errorMsg      = $("error-msg");
const errorClose    = $("error-close");

// Progress steps
const stepGen = $("step-gen");
const stepRev = $("step-rev");
const stepRef = $("step-ref");
const lineRefine = $("line-refine");

// Stage sections
const stageGenerated = $("stage-generated");
const stageReview    = $("stage-review");
const stageRefined   = $("stage-refined");

// Content targets
const genExplanation  = $("gen-explanation");
const genMcqs         = $("gen-mcqs");
const reviewVerdict   = $("review-verdict");
const reviewFeedback  = $("review-feedback");
const refExplanation  = $("ref-explanation");
const refMcqs         = $("ref-mcqs");
const refinedVerdict  = $("refined-verdict");
const refinedFeedback = $("refined-feedback");


/* ── Helpers ── */

function showLoader(msg) {
  loaderText.textContent = msg || "Running agents…";
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBanner.classList.remove("hidden");
}

function hideError() {
  errorBanner.classList.add("hidden");
}

function setStep(step, state) {
  // state: 'pending' | 'active' | 'done' | 'skipped'
  step.className = "progress-step " + state;
}

function buildExplanation(container, text) {
  container.innerHTML = `
    <span class="content-block-label">Explanation</span>
    ${escHtml(text)}
  `;
}

function buildMcqs(container, mcqs) {
  container.innerHTML = "";
  mcqs.forEach((q, i) => {
    const letters = ["A", "B", "C", "D"];
    const optionsHtml = q.options.map((opt, idx) => {
      const letter = letters[idx];
      const isCorrect = letter === q.answer;
      return `<div class="mcq-option ${isCorrect ? "correct" : ""}">
                ${letter}. ${escHtml(opt)}
              </div>`;
    }).join("");

    container.insertAdjacentHTML("beforeend", `
      <div class="mcq-card">
        <div class="mcq-number">Question ${i + 1}</div>
        <div class="mcq-question">${escHtml(q.question)}</div>
        <div class="mcq-options">${optionsHtml}</div>
        <div class="mcq-answer">✓ Answer: ${escHtml(q.answer)}</div>
      </div>
    `);
  });
}

function buildVerdict(container, status) {
  const icon   = status === "pass" ? "✓ PASS" : "✗ FAIL";
  container.className = "verdict " + status;
  container.textContent = icon;
}

function buildFeedback(container, items, isPassing) {
  container.className = "feedback-list" + (isPassing ? " pass-list" : "");
  if (!items || items.length === 0) {
    container.innerHTML = `<li>No issues found — content is ready.</li>`;
  } else {
    container.innerHTML = items.map(f => `<li>${escHtml(f)}</li>`).join("");
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


/* ── Main pipeline runner ── */

async function runPipeline() {
  const grade = parseInt(gradeInput.value, 10);
  const topic = topicInput.value.trim();

  // Validate
  if (!topic) {
    showError("Please enter a topic before running.");
    topicInput.focus();
    return;
  }
  if (isNaN(grade) || grade < 1 || grade > 12) {
    showError("Grade must be a number between 1 and 12.");
    gradeInput.focus();
    return;
  }

  hideError();

  // Reset UI
  pipeline.classList.add("hidden");
  stageRefined.classList.add("hidden");
  [stageGenerated, stageReview].forEach(s => s.classList.remove("hidden"));
  [stepGen, stepRev, stepRef].forEach(s => setStep(s, "pending"));
  lineRefine.className = "progress-line";

  runBtn.disabled = true;

  // Step indicator: generating
  showLoader("Generator Agent is drafting content…");
  setStep(stepGen, "active");

  let result;
  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, topic })
    });
    result = await res.json();

    if (!res.ok) throw new Error(result.error || "Server error");
  } catch (err) {
    hideLoader();
    showError("Pipeline failed: " + err.message);
    runBtn.disabled = false;
    return;
  }

  // Show pipeline container
  pipeline.classList.remove("hidden");

  // ── Stage A: Generator output ──
  setStep(stepGen, "done");
  showLoader("Reviewer Agent is evaluating…");
  setStep(stepRev, "active");
  await sleep(300); // tiny pause for visual drama

  buildExplanation(genExplanation, result.generated.explanation);
  buildMcqs(genMcqs, result.generated.mcqs);

  // ── Stage B: Review ──
  await sleep(400);
  setStep(stepRev, "done");
  buildVerdict(reviewVerdict, result.review.status);
  buildFeedback(reviewFeedback, result.review.feedback, result.review.status === "pass");

  // ── Stage C: Refined (if fail) ──
  if (result.refined) {
    lineRefine.className = "progress-line active";
    showLoader("Refiner is regenerating with feedback…");
    setStep(stepRef, "active");
    await sleep(500);

    stageRefined.classList.remove("hidden");
    buildExplanation(refExplanation, result.refined.explanation);
    buildMcqs(refMcqs, result.refined.mcqs);

    lineRefine.className = "progress-line done";
    setStep(stepRef, "done");
  } else {
    // No refinement needed
    lineRefine.className = "progress-line";
    setStep(stepRef, "skipped");
    stageRefined.classList.add("hidden");
  }

  hideLoader();
  runBtn.disabled = false;

  // Scroll to pipeline
  pipeline.scrollIntoView({ behavior: "smooth", block: "start" });
}


/* ── Event listeners ── */

runBtn.addEventListener("click", runPipeline);
errorClose.addEventListener("click", hideError);

topicInput.addEventListener("keydown", e => {
  if (e.key === "Enter") runPipeline();
});

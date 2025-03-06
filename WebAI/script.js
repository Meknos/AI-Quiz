// Global variables to store quiz state
let questions = []
let currentQuestionIndex = 0
let userAnswers = []
let currentScore = 0

async function generateQuestions() {
  const topic = document.getElementById("topic").value;
  const count = Number.parseInt(document.getElementById("question-count").value);

  if (!topic || isNaN(count) || count < 1 || count > 10) {
    alert("Vui lòng nhập chủ đề và số câu hỏi hợp lệ (1-10)!");
    return;
  }

  // Hiển thị loading
  document.getElementById("loading").classList.remove("hidden");

  const apiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDijs4L5KVp8iU09EZIAfZALfxGD4q7epU";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Tạo ${count} câu hỏi trắc nghiệm khác nhau về chủ đề: ${topic}. 
                Mỗi câu hỏi có 4 phương án trả lời (A, B, C, D), trong đó chỉ có 1 đáp án đúng.
                Trả về mỗi câu hỏi theo định dạng sau và phân tách bằng "---":
                Câu hỏi: <câu hỏi>
                A. <đáp án A>
                B. <đáp án B>
                C. <đáp án C>
                D. <đáp án D>
                Đáp án đúng: <chữ cái đáp án đúng>
                ---
                `,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const questionBlocks = content.split("---").map((q) => q.trim()).filter(Boolean);
    
    questions = questionBlocks.map(parseQuestion).filter(Boolean);
  } catch (error) {
    console.error("Lỗi khi gọi API:", error);
  }

  // Ẩn loading
  document.getElementById("loading").classList.add("hidden");

  if (questions.length === 0) {
    alert("Không thể tạo câu hỏi. Vui lòng thử lại!");
    return;
  }

  // Khởi tạo quiz
  currentQuestionIndex = 0;
  userAnswers = Array(questions.length).fill(null);
  currentScore = 0;

  document.getElementById("setup-section").classList.add("hidden");
  document.getElementById("quiz-section").classList.remove("hidden");
  document.getElementById("total-questions").textContent = questions.length;
  document.getElementById("max-score").textContent = questions.length;
  document.getElementById("current-score").textContent = "0";

  displayCurrentQuestion();
  updateNavigationButtons();
}


function parseQuestion(content) {
  const lines = content.split("\n").map((line) => line.trim()).filter((line) => line);
  
  let question = "";
  let choices = [];
  let correctAnswer = "";

  for (let line of lines) {
    if (line.startsWith("Câu hỏi:")) {
      question = line.replace("Câu hỏi:", "").trim();
    } else if (/^[A-D]\./.test(line)) {
      choices.push(line);
    } else if (line.startsWith("Đáp án đúng:")) {
      correctAnswer = line.replace("Đáp án đúng:", "").trim();
    }
  }

  return question && correctAnswer ? { question, choices, correctAnswer } : null;
}


function displayCurrentQuestion() {
  const container = document.getElementById("question-container")
  const currentQuestion = questions[currentQuestionIndex]

  if (!currentQuestion) return

  document.getElementById("current-question").textContent = currentQuestionIndex + 1

  const userAnswer = userAnswers[currentQuestionIndex]
  const showFeedback = userAnswer !== null

  let questionHtml = `
        <div class="question-block">
            <h3>${currentQuestionIndex + 1}. ${currentQuestion.question}</h3>
            <div class="answer-options">
    `

  currentQuestion.choices.forEach((choice, index) => {
    const optionLetter = choice[0] // A, B, C, or D
    const isSelected = userAnswer === optionLetter
    const isCorrect = currentQuestion.correctAnswer === optionLetter

    let optionClass = "answer-option"
    let feedbackIcon = ""

    if (showFeedback) {
      if (isSelected) {
        optionClass += isCorrect ? " correct" : " incorrect"
        feedbackIcon = isCorrect ? '<span class="feedback-icon">✓</span>' : '<span class="feedback-icon">✗</span>'
      } else if (isCorrect) {
        optionClass += " correct"
        feedbackIcon = '<span class="feedback-icon">✓</span>'
      }
    } else if (isSelected) {
      optionClass += " selected"
    }

    questionHtml += `
            <div class="${optionClass}" onclick="selectAnswer('${optionLetter}')">
                <input type="radio" name="q${currentQuestionIndex}" value="${optionLetter}" ${isSelected ? "checked" : ""} ${showFeedback ? "disabled" : ""}>
                <span>${choice}</span>
                ${feedbackIcon}
            </div>
        `
  })

  questionHtml += `
            </div>
        </div>
    `

  container.innerHTML = questionHtml
}

function selectAnswer(answer) {
  // If already answered, don't allow changing
  if (userAnswers[currentQuestionIndex] !== null) return

  userAnswers[currentQuestionIndex] = answer

  // Check if answer is correct
  const currentQuestion = questions[currentQuestionIndex]
  const isCorrect = answer === currentQuestion.correctAnswer

  if (isCorrect) {
    currentScore++
    document.getElementById("current-score").textContent = currentScore
  }

  // Show feedback
  displayCurrentQuestion()

  // Enable navigation to next question
  updateNavigationButtons()
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++
    displayCurrentQuestion()
    updateNavigationButtons()
  }
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--
    displayCurrentQuestion()
    updateNavigationButtons()
  }
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById("prev-btn")
  const nextBtn = document.getElementById("next-btn")
  const finishBtn = document.getElementById("finish-btn")

  // Show/hide previous button
  if (currentQuestionIndex > 0) {
    prevBtn.classList.remove("hidden")
  } else {
    prevBtn.classList.add("hidden")
  }

  // Show/hide next button
  if (currentQuestionIndex < questions.length - 1) {
    nextBtn.classList.remove("hidden")
    finishBtn.classList.add("hidden")
  } else {
    nextBtn.classList.add("hidden")

    // Only show finish button if all questions are answered
    const allAnswered = userAnswers.every((answer) => answer !== null)
    if (allAnswered) {
      finishBtn.classList.remove("hidden")
    } else {
      finishBtn.classList.add("hidden")
    }
  }
}

function finishQuiz() {
  // Show results section
  document.getElementById("quiz-section").classList.add("hidden")
  document.getElementById("results-section").classList.remove("hidden")

  // Update final score
  document.getElementById("final-score").textContent = currentScore
  document.getElementById("final-max-score").textContent = questions.length

  // Set result message based on score
  const percentage = (currentScore / questions.length) * 100
  let message = ""

  if (percentage === 100) {
    message = "Tuyệt vời! Bạn đã trả lời đúng tất cả các câu hỏi!"
  } else if (percentage >= 80) {
    message = "Rất tốt! Bạn đã làm rất tốt!"
  } else if (percentage >= 60) {
    message = "Khá tốt! Bạn đã vượt qua bài kiểm tra!"
  } else if (percentage >= 40) {
    message = "Bạn cần cố gắng hơn nữa!"
  } else {
    message = "Hãy tiếp tục học tập và thử lại!"
  }

  document.getElementById("result-message").textContent = message
}

function resetQuiz() {
  // Reset to setup screen
  document.getElementById("results-section").classList.add("hidden")
  document.getElementById("setup-section").classList.remove("hidden")

  // Clear form fields
  document.getElementById("topic").value = ""
  document.getElementById("question-count").value = ""

  // Reset quiz state
  questions = []
  currentQuestionIndex = 0
  userAnswers = []
  currentScore = 0
}
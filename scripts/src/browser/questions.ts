export function Question(qId: number, questionText: string, answer1: string, answer2: string, answer3: string, answer4: string, lang?: string, id?: number, codesnippet?: string) {
    let langClass = ""

    if (id !== undefined) {
        qId = id
    }
    if (lang === "python") {
        langClass = "curriculum-python"
    } else if (lang === "javascript") {
        langClass = "curriculum-javascript"
    } 

    if (codesnippet != undefined) {
        codesnippet = codesnippet.replace(new RegExp("\n", "g"),"<br />")
        codesnippet = codesnippet.replace(new RegExp("\t", "g"),"&nbsp;")
        questionText = questionText + "<p><kbd class='kbd "+langClass+"''>" + codesnippet + "</kbd></p>"
    }

    const question = document.createElement("li")
    question.classList.add("question")
    if (langClass) question.classList.add(langClass)
    question.innerHTML = questionText
    const icon = document.createElement("i")
    icon.classList.add("icon", "icon-checkmark")
    question.prepend(icon)

    const answerList = document.createElement("ul")
    answerList.classList.add("answers")
    if (langClass) answerList.classList.add(langClass)
    question.appendChild(answerList)

    const answerTexts = [answer1, answer2, answer3]
    if (answer4) answerTexts.push(answer4)
    const answers = answerTexts.map((answerText, i) => {
        const item = document.createElement("li")
        const label = document.createElement("label")
        const input = document.createElement("input")
        const control = document.createElement("span")
        const span = document.createElement("span")
        item.appendChild(label)
        label.appendChild(input)
        label.appendChild(control)
        label.appendChild(span)

        input.type = "radio"
        input.name = "q" + qId
        input.onclick = () => {
            if (i === 0) {
                item.classList.add("correct")
                question.classList.add("complete")
                question.querySelectorAll("input").forEach(el => el.disabled = true)
                question.querySelectorAll(".incorrect").forEach(el => el.classList.remove("incorrect"))
            } else {
                item.classList.add("incorrect")
            }
        }
        control.classList.add("control")
        span.innerText = answerText + " "  // space included for wrapping ::after
        return item
    })

    while (answers.length) {
        const index = Math.floor(Math.random() * answers.length)
        answerList.appendChild(answers[index])
        answers.splice(index, 1)
    }

    document.getElementById("questionsContainer")!.appendChild(question)
}
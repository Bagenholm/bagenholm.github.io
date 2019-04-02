var basicApiAdress = 'https://opentdb.com/api.php?amount=10&type=multiple';
var questionArray;
var nextQuestionIndex = 0;
var alternatives;
var totalPoints = 0;
var questionsAsked = 0;
var questionState = true;
var currentQuizPoints = 0;
var altBoxes = document.querySelectorAll("div");

// Flöde:
//     1. Hämta vald category och difficulty.
//     2. Hämta frågor från api till frågearray.
//     3. Lägg svarsalternativ i en sorterad array.
//     4. Uppdatera html: fråga och svarsalternativ.
//     5. svarsalternativ onClick: Uppdatera färger för att matcha rätt/fel. Öka index frågearray. Uppdatera result.
//     6. svarsalternativ onClick: Ändra färg och hämta ny fråga.
//     7. Efter frågearray[9], börja om från 1.

setOnClick();
getQuestions();

function getQuestions() {
    var url = checkSettings();
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            questionArray = JSON.parse(this.responseText);
            newQuestion();
        } else if (this.status == 500) {
            document.getElementById("question").innerHTML = "Umm.. I don't know any questions, api is down. Err.. What's your favorite dinosaur?"
            document.getElementById("alt0text").innerHTML = "T-rex.";
            document.getElementById("alt1text").innerHTML = "Tyrannosaurus Rex.";
            document.getElementById("alt2text").innerHTML = "That short-armed one with a temper.";
            document.getElementById("alt3text").innerHTML = "Not T-rex."; // Not T-rex? What? The answer is *always* T-rex.
        }
    };
    xhttp.open("GET", url, true);
    xhttp.send();
}

function checkSettings() {
    let category = document.getElementById("category");
    let difficulty = document.getElementById("difficulty");
    return basicApiAdress + '&category=' + category.value + '&difficulty=' + difficulty.value;
}

function newQuestion() {
    alternatives = makeAlternativeArray().sort();
    document.getElementById("question").innerHTML = questionArray.results[nextQuestionIndex].question;
    document.getElementById("alt0text").innerHTML = alternatives[0];
    document.getElementById("alt1text").innerHTML = alternatives[1];
    document.getElementById("alt2text").innerHTML = alternatives[2];
    document.getElementById("alt3text").innerHTML = alternatives[3];
}

function makeAlternativeArray() {
    var altArray = [questionArray.results[nextQuestionIndex].correct_answer,
        questionArray.results[nextQuestionIndex].incorrect_answers[0],
        questionArray.results[nextQuestionIndex].incorrect_answers[1],
        questionArray.results[nextQuestionIndex].incorrect_answers[2]];
    return altArray;
}

function setOnClick() {
    for (let i = 0; i < altBoxes.length; i++) {
        altBoxes[i].onclick = function (e) {
            selectAnswer(i);
        }
    }
}

function selectAnswer(choice) {
    if (questionState) {
        document.getElementById("currentQuiz").value = nextQuestionIndex + 1;
        setAnswerColors();
        if (isCorrectAnswer(choice)) {
            totalPoints++;
            currentQuizPoints++;
            document.getElementById("answer").innerHTML = "Correct!";
        } else {
            document.getElementById("answer").innerHTML = "Incorrect! The right answer was " + questionArray.results[nextQuestionIndex].correct_answer;
        }
        questionsAsked++;
        document.getElementById("result").innerHTML = "" + totalPoints + "/" + questionsAsked;
        questionState = false;
    } else {
        document.getElementById("result").innerHTML = "" + totalPoints + "/" + questionsAsked;
        nextQuestionIndex++;
        checkQuestionIndex();
        setAlternativeColors();
        questionState = true;
    }
}

function setAnswerColors(){
    for (let i = 0; i < altBoxes.length; i++) {
        if (alternatives[i] == questionArray.results[nextQuestionIndex].correct_answer) {
            altBoxes[i].style.backgroundColor = "green";
        } else {
            altBoxes[i].style.backgroundColor = "red"
        }
    }
}

function isCorrectAnswer(choice) {
    return alternatives[choice] == questionArray.results[nextQuestionIndex].correct_answer;
}

function checkQuestionIndex() {
    if (nextQuestionIndex < questionArray.results.length) {
        newQuestion();
        checkSettings();
    } else {
        document.getElementById("currentQuiz").value = 0;
        getQuestions();
        quizEndResult();
        currentQuizPoints = 0;
        nextQuestionIndex = 0;
    }
}

function setAlternativeColors() {
    elements = document.getElementsByClassName("altbox");
    for (let i = 0; i < elements.length ; i++) {
        elements[i].style.backgroundColor = "#444";
    }
}

function quizEndResult() {
    document.getElementById("infoText").innerHTML = "Last quiz: " + currentQuizPoints + " / 10";
}
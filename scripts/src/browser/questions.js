//@authors: Randall Harris & Avrosh K
Question = function(questionNumber, questionText, answer1, answer2, answer3, answer4, lang, id, codesnippet) {
  var answers = new Array()
  var qId = questionNumber; 
  var langClass = '';

  if (id != undefined) {
    qId = id;
  }
  if (lang == 'python') {
    langClass = 'curriculum-python';
  } else if (lang == 'javascript') {
    langClass = 'curriculum-javascript';
  } 

  if (codesnippet != undefined) {
    codesnippet = codesnippet.replace(new RegExp("\n", 'g'),"<br />");
    codesnippet = codesnippet.replace(new RegExp("\t", 'g'),"&nbsp;");
    questionText = questionText + "<p><kbd class='kbd "+langClass+"''>" + codesnippet + "</kbd></p>";
  }

  answers[0]="<input type='radio' name='"+ qId +"' value='a' id='correct"+qId+"' style='margin-right: 15px' onclick='checkAnswer(this)' /><label id='correct"+qId+"_lbl' for='correct"+qId+"' name='correct"+qId+"' style='padding:2px;display:inline;'>" + answer1 + "</label><span style ='display:none; color:green; padding-left:10px; font-size:smaller;'> Correct! </span><br/>"
  answers[1]="<input type='radio' name='"+ qId +"' value='b' id='q"+qId+"b' style='margin-right: 15px' onclick='checkAnswer(this)' /><label id='q"+qId+"b_lbl' for='q"+qId+"b' style='padding:2px;display:inline;' class='shake'>" + answer2 + "</label><span class='feedback-text' style ='display:none; color:red; padding-left:10px; font-size:smaller;'> Try Again! </span><br/>"
  answers[2]="<input type='radio' name='"+ qId +"' value='c' id='q"+qId+"c' style='margin-right: 15px' onclick='checkAnswer(this)' /><label id='q"+qId+"c_lbl' for='q"+qId+"c' style='padding:2px;display:inline;' class='shake'>" + answer3 + "</label><span class='feedback-text' style ='display:none; color:red; padding-left:10px; font-size:smaller;'> Try Again! </span><br/>"
  if(answer4) answers[3]="<input type='radio' name='"+ qId +"' value='d' id='q"+qId+"d' style='margin-right: 15px' onclick='checkAnswer(this)' /><label id='q"+qId+"d_lbl' for='q"+qId+"d' style='padding:2px;display:inline;' class='shake'>" + answer4 + "</label><span class='feedback-text' style ='display:none; color:red; padding-left:10px; font-size:smaller;'> Try Again! </span><br/>"

  var content = "<p class='question "+langClass+"'>" + questionNumber.toString() +". "+ questionText +"</p>";

  content = content + "<ul class='answers "+langClass+"'>";
  var i=0;
  var random;
  while (i<answers.length){
    random=Math.floor(Math.random()*answers.length)
    if (answers[random]!="selected"){
      content = content + answers[random];
      answers[random]="selected"
      i++;
    }
  }
  content = content + "</ul>"; 
  var currentContent = document.getElementById('questionsContainer').innerHTML;
  document.getElementById('questionsContainer').innerHTML = currentContent + content;  
}

function checkAnswer(elem) {
  lbl = document.getElementById(elem.id+'_lbl');
  if (elem.id.includes("correct")) { 
    markCorrect(lbl);
    showFeedback(lbl);
    hideIncorrectFeedback(lbl);
  }
  else {
    markIncorrect(lbl);
    showFeedback(lbl);
  }
};

function markCorrect(elem) {
  elem.style.color = "green";
  elem.style.border = "1px solid green";
  elem.style.borderRadius = "3px";
  elem.style.fontWeight = "bold";
}

function markIncorrect(elem) {
  elem.className += lbl.className ? ' notAllowedTo' : ' notAllowedTo';
  elem.style.color = "red";
}

function showFeedback(elem) {
  elem.nextSibling.style.display="inline-block";
}

function hideIncorrectFeedback(elem) {
  lbls = elem.parentNode.getElementsByClassName('feedback-text');
  for (var i=0; i<lbls.length; i++) {
    lbls[i].className += lbls[i].className ? ' hide-all' : ' hide-all';
  }
}

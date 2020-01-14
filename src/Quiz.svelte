<script>
import { progress } from './Progress.js'
import { onMount } from 'svelte';
import {htmlDecode,shuffles} from './utlis.js';
import QuizHeader from './QuizHeader.svelte';
import Notification from './Notification.svelte';
import Login from './Login.svelte';

let data;
let questionNo=0;
let loginScreen=true;
let userSelection;
let username='';
let score=0;
let notficationBox=false;
let notficationMessage=false;
let userResponses=[];
let resultScreen=false;
onMount(async()=>{
    const response= await fetch('http://www.json-generator.com/api/json/get/cftWfSJxAi?indent=2');
    const result= await response.json();
    data=result.results;
    userResponses=data.map(userResponse=> {
        return {
        question:htmlDecode(userResponse.question),
        correctAnswer:userResponse.correct_answer,
        answerChocies: shuffles([...userResponse.incorrect_answers,userResponse.correct_answer].map(ans=>htmlDecode(ans))),
        category:userResponse.category,
        difficulty: userResponse.difficulty,
        answerByUser:'',
        correct:false,    
        answered:false,
        }
    })
});

function handleClick(e) {
    let userResponseCopy= {...userResponses[questionNo]};
    if(e.target.value===userResponses[questionNo].correctAnswer) {
        userResponseCopy.correct=true;
        userResponseCopy.answered=true;
        userResponseCopy.answerByUser=userResponses[questionNo].correctAnswer;
        userResponses[questionNo]=userResponseCopy;
        score +=1;
        notficationMessage=true;
    }
    else {
        userResponseCopy.correct=false;
        userResponseCopy.answered=true;
        userResponseCopy.answerByUser=e.target.value;
        userResponses[questionNo]=userResponseCopy;
        notficationMessage=false;
    }
    if(!notficationBox) notficationBox=true;
}
function handleButtonOperation(e) {
    userSelection='';
    if(notficationBox) notficationBox=!notficationBox;
    progress.set((questionNo+1)/userResponses.length);
    if(userResponses.length>questionNo+1) questionNo +=1;
    else resultScreen=true;

}
function handleRetake() {
    window.location.href="/";
}
function userName(event) {
    username=event.detail.name.toUpperCase();
    loginScreen=false;
}

</script>
<style>
.resultScreen {
    font-size: 30px;
    justify-content: center;
}
.score {
    justify-content: center;
    font-size: 100px;
}
 .choice{
    border: 2px solid #2F3450;
    padding: 20px;
    width: 71%;
    margin: 10px auto;
    text-align: left;
}
.choice input {
    margin-right: 10px;
}
.choice:hover {
    cursor: pointer;
    box-shadow: 0px 2px 20px #2F3450;
}
.nextAction {
    flex: 1;
display: flex;
}
.questionText {
    flex: 1;
    display: flex;
}
.questionDifficulty {
    background: #1FCAD1;
    padding: 5px 20px;
    border-radius: 5px;
}
.retake {
    justify-content: center;
    font-size: 16px;
}
.category {
    color:#464B6C
}
</style>
<div class="container">
    {#if loginScreen}
    <Login on:message={userName}/>
    {:else}
        {#if userResponses.length!==0 && !resultScreen}
        <QuizHeader name={username}/>
        <div class="questionNo">
            <div class="questionText">Question {questionNo+1}</div>
            <div class="questionDifficulty">{userResponses[questionNo].difficulty}</div>
            </div>
        <div><span class="category">Category:</span> {userResponses[questionNo].category}</div>
        <div>{userResponses[questionNo].question}</div>
            {#each userResponses[questionNo].answerChocies as answerChoice}
            <label class="choice"><input type="radio" bind:group={userSelection} value={answerChoice} on:click={handleClick}/>{answerChoice}</label>
            {/each}
            <div>
                <div class="nextAction">   {#if notficationBox}
                    <Notification message={notficationMessage}></Notification>
                    {/if}
                </div>
                <button  on:click|preventDefault={handleButtonOperation}>Next</button></div>
        {:else if resultScreen}
            <div class="resultScreen">You're Score is </div>
            <div class="score">{score} / 10 </div>
            <div class="retake">  <button  on:click|preventDefault={handleRetake}>ReTake</button> </div>
        {:else}
        <h1>Fetching Questions....</h1>
        {/if}
    {/if}
</div>






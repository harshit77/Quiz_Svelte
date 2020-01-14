<script>
export  let message;
</script>

<style>
.correct {
    background: #8cba51;
    color: #fff;
    padding: 10px 50px;
    border-radius: 5px;
    box-shadow: 0px 2px 20px #2F3450;
}
.incorrect{
    background: #f0134d;
    color: #fff;
    padding: 10px 50px;
    border-radius: 5px;
    box-shadow: 0px 2px 20px #2F3450;
}
</style>

{#if message}
<div class="correct">
    Correct
</div>
{:else}
<div class="incorrect">
  InCorrect 
</div>
{/if}
<script>
    import { progress } from './progress.js'
    export let name;
</script>

<style>
    header {
        display: flex;
        flex-flow: row nowrap;
        width: 75%;
        justify-content: flex-start;
        align-items: flex-start;
        border-bottom: 3px solid #2B304C;
        margin: 20px auto;
        padding: 10px 0 20px 0;
    }
   .userName {
    flex: 1;
    display: flex;
    }
    .usernameIndicator {
        border-radius: 50%;
        width: 20px;
        height: 20px;
        background: #1FCAD1;
        margin-right: 10px;
    } 
   
   progress {
            display: block;
            width: 100%;
        }

</style>

<header>
    <div class="userName">
       <span class="usernameIndicator"></span>{name.toUpperCase()}
    </div>
    <div>
        <div>Total Test Completed </div>
        <div><progress value={$progress}></progress></div>
    </div>
</header>
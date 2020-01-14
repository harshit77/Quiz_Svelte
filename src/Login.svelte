<script>
    import {createEventDispatcher} from 'svelte';
    let username='';
    const dispatch= createEventDispatcher();
    function proceed() {
        dispatch('message',{
            name:username
        })
    }

</script>
<style>
    .proceed {
justify-content: flex-end;
    }
    .fullWidth {
        width: 100%;
    }
     input {
    border-radius: 5px;
    margin-left: 10px;
    background: #2F3450;
    width: 40%;
    margin-top: 45px;
    padding: 12px;
    color: #ffffff;
     }
</style>
<div class="container">
    <label class="fullWidth">Username:<input type="text" bind:value={username}/> </label>
    <div class="proceed fullWidth"><button on:click={proceed} disabled={username ==='' ? 'disbaled' :''}>Proceed</button></div>
</div>
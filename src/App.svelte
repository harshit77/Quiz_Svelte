<script>
	import Quiz from './Quiz.svelte';
	
	export let name;
</script>

<main>
	<h1>Quiz App</h1>
	<p>Hello {name} We have built this quiz app demo on Svelte Hope you will like it for more info Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps and compare it with React app <a href="https://reactquizapp.netlify.com/">React App </a></p>
	<Quiz/>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	:global(.container) {
    display: flex;
    background: #282D49;
    border-radius: 5px;
    justify-content: center;
    align-items: center;
    flex-flow: row wrap;
    color: #ffffff;
    margin:  0 auto;
    min-height: 300px;
    width: 65%;
}
	:global(.container >div){
		display: flex;
    width: 75%;
    margin: 20px auto;
	}
	:global(button) {
    padding: 10px 70px;
    background:#4B22F3;
    color: #ffffff; 
    cursor: pointer;
    margin: 0;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>

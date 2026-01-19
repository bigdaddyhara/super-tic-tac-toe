import './style.css'

const root = document.getElementById('app')!

const container = document.createElement('div')
container.className = 'placeholder'
container.innerHTML = `
	<div class="placeholder-inner">
		<h1>Super Ultimate Tic Tac Toe</h1>
		<p class="muted">Coming soon</p>
	</div>
`

root.appendChild(container)

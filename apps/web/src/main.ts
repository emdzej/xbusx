import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'

const target = document.getElementById('app')
if (target === null) throw new Error('Missing #app target in index.html')

mount(App, { target })

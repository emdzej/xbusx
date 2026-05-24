import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'
import { applyLoggerConfig } from './lib/logger-wiring.js'
import { applyTheme, watchSystemTheme } from './lib/settings-theme.js'
import { CONFIG_KEY, type IbusxConfig, loadConfig } from './lib/storage.js'

// Apply theme + logger config BEFORE Svelte mounts so the first
// paint already matches saved choices (no flash) and component-init
// log calls hit the user's chosen level. The OS-preference watcher
// is installed once for the page lifetime — it only fires when the
// user picked "system".
applyTheme()
watchSystemTheme()
applyLoggerConfig(loadConfig<IbusxConfig>(CONFIG_KEY)?.logging)

const target = document.getElementById('app')
if (target === null) throw new Error('Missing #app target in index.html')

mount(App, { target })

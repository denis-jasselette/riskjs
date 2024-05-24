import { render } from 'preact'
import { App } from './App.tsx'
import './index.module.scss'
import ReactModal from 'react-modal'

ReactModal.setAppElement('#app')

render(<App />, document.getElementById('app')!)

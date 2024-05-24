import '@/index.module.scss'

import { render } from 'preact'
import ReactModal from 'react-modal'

import { App } from '@/App.tsx'

ReactModal.setAppElement('#app')

render(<App />, document.getElementById('app')!)

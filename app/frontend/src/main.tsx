import ReactDOM from 'react-dom/client';
import '@arco-design/web-react/dist/css/arco.css';
import App from './App';
import './styles/global.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}

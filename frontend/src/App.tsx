import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { CapturePage } from './pages/CapturePage';
import { EvidenceListPage } from './pages/EvidenceListPage';
import { EvidenceDetailPage } from './pages/EvidenceDetailPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2L4 8V16C4 23.2 9.2 29.6 16 31C22.8 29.6 28 23.2 28 16V8L16 2Z" 
                      stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M12 16L15 19L21 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="logo-text">EvidenTrace</span>
            </div>
            <nav className="nav">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Capture
              </NavLink>
              <NavLink to="/evidence" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Evidence
              </NavLink>
            </nav>
            <div className="header-badge">
              <span className="badge badge-warning">Local Only</span>
            </div>
          </div>
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<CapturePage />} />
            <Route path="/evidence" element={<EvidenceListPage />} />
            <Route path="/evidence/:id" element={<EvidenceDetailPage />} />
          </Routes>
        </main>

        <footer className="footer">
          <div className="footer-content">
            <p className="footer-disclaimer">
              EvidenTrace is a technical evidence capture tool. It is NOT a qualified trust service 
              and does not independently attest to legal authenticity.
            </p>
            <p className="footer-version">v1.0.0</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

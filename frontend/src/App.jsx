import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import KundenList from './pages/KundenList';
import KundenDetail from './pages/KundenDetail';
import ErsatzteileList from './pages/ErsatzteileList';
import ErsatzteileDetail from './pages/ErsatzteileDetail';
import MaschinenList from './pages/MaschinenList';
import MaschinenDetail from './pages/MaschinenDetail';
import AnsprechpartnerList from './pages/AnsprechpartnerList';
import AnsprechpartnerDetail from './pages/AnsprechpartnerDetail';
import StammdatenPage from './pages/StammdatenPage';
import SystemPage from './pages/SystemPage';

const NavIcon = ({ path }) => (
  <svg className="nav-icon" viewBox="0 0 20 20" fill="currentColor">
    {path}
  </svg>
);

const icons = {
  dashboard: <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />,
  tickets: <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />,
  kunden: <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z" />,
  ansprechpartner: <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />,
  ersatzteile: <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />,
  maschinen: <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />,
  stammdaten: <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />,
  system: <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />,
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h1>Service Tool</h1>
            <span>v2.0</span>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-section">Übersicht</div>
            <NavLink to="/dashboard" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.dashboard} />
              Dashboard
            </NavLink>

            <div className="nav-section">Service</div>
            <NavLink to="/tickets" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.tickets} />
              Tickets
            </NavLink>

            <div className="nav-section">Stamm</div>
            <NavLink to="/kunden" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.kunden} />
              Kunden
            </NavLink>
            <NavLink to="/ansprechpartner" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.ansprechpartner} />
              Ansprechpartner
            </NavLink>
            <NavLink to="/maschinen" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.maschinen} />
              Maschinen
            </NavLink>
            <NavLink to="/ersatzteile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.ersatzteile} />
              Ersatzteile
            </NavLink>

            <div className="nav-section">Verwaltung</div>
            <NavLink to="/stammdaten" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.stammdaten} />
              Stammdaten
            </NavLink>
            <NavLink to="/system" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <NavIcon path={icons.system} />
              System
            </NavLink>
          </nav>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/kunden" element={<KundenList />} />
            <Route path="/kunden/:id" element={<KundenDetail />} />
            <Route path="/maschinen" element={<MaschinenList />} />
            <Route path="/maschinen/:id" element={<MaschinenDetail />} />
            <Route path="/ersatzteile" element={<ErsatzteileList />} />
            <Route path="/ersatzteile/:id" element={<ErsatzteileDetail />} />
            <Route path="/ansprechpartner" element={<AnsprechpartnerList />} />
            <Route path="/ansprechpartner/:id" element={<AnsprechpartnerDetail />} />
            <Route path="/stammdaten" element={<StammdatenPage />} />
            <Route path="/system" element={<SystemPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

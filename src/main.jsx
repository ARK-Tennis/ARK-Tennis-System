import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Stringing from './Stringing.jsx';
import Status from './Status.jsx';
import Admin from './Admin.jsx';
import Waiver from './Waiver.jsx';
import Manage from './Manage.jsx';
import CalendarAdmin from './CalendarAdmin.jsx';
import Lessons from './Lessons.jsx';
import GiftCertificates from './GiftCertificates.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/stringing" element={<Stringing />} />
        <Route path="/status/:link" element={<Status />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/waiver" element={<Waiver />} />
        <Route path="/manage/:token" element={<Manage />} />
        <Route path="/calendar" element={<CalendarAdmin />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/gift-certificates" element={<GiftCertificates />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

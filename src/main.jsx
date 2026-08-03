import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Stringing from './Stringing.jsx';
import Status from './Status.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/stringing" element={<Stringing />} />
        <Route path="/status/:link" element={<Status />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/logIn';
import Register from './pages/Rejester';
import Chat from './pages/Chat';
import Profile from './pages/Profile';

const App = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/chat" /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/chat" /> : <Register />}
      />
      <Route
        path="/chat"
        element={isAuthenticated ? <Chat /> : <Navigate to="/login" />}
      />
      <Route
        path="/profile"
        element={isAuthenticated ? <Profile /> : <Navigate to="/login" />}
      />
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default App;
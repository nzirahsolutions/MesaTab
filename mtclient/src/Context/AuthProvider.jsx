import {useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import {jwtDecode} from 'jwt-decode';

export const AuthProvider = ({ children }) => {
  
  // Initialize from localStorage
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem('tab');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedEvent, setSelectedEvent] = useState(() => {
    const saved = localStorage.getItem('selectedEvent');
    return saved ? JSON.parse(saved) : null;
  });
  const [isEvent, setIsEvent] = useState(() => {
    const saved = localStorage.getItem('isEvent');
    return saved ? JSON.parse(saved) : false;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('isEvent', JSON.stringify(isEvent));
  }, [isEvent]);

  useEffect(() => {
    if(user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tab', JSON.stringify(tab));
  }, [tab]);

  useEffect(() => {
    localStorage.setItem('selectedEvent', JSON.stringify(selectedEvent));
  }, [selectedEvent]);

    // Rehydrate user from token on app start
  useEffect(() => {
    if (user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);

      if (!decoded?.exp || decoded.exp <= now || !decoded?.userInfo) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return;
      }
      setUser(decoded.userInfo);
    
    } catch {
      localStorage.removeItem('token');
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, selectedEvent, setSelectedEvent, tab, setTab , isEvent, setIsEvent}}>
      {children}
    </AuthContext.Provider>
  );
};



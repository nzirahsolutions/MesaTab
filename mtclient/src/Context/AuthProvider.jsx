import {useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  // Initialize from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('isAuthenticated');
    return saved ? JSON.parse(saved) : true;
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : {
      id: 1,
      name: "John Doe",
      email: 'JohnDoe@test.com',
      events: [1, 3],
    };
  });

  const [tabType, setTabType] = useState(() => {
    const saved = localStorage.getItem('tabType');
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
    localStorage.setItem('isAuthenticated', JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);
  useEffect(() => {
    localStorage.setItem('isEvent', JSON.stringify(isEvent));
  }, [isEvent]);

  useEffect(() => {
    localStorage.setItem('user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('selectedEvent', JSON.stringify(selectedEvent));
  }, [selectedEvent]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, user, setUser, selectedEvent, setSelectedEvent, tabType, setTabType , isEvent, setIsEvent}}>
      {children}
    </AuthContext.Provider>
  );
};



import {useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import {jwtDecode} from 'jwt-decode';

export const AuthProvider = ({ children }) => {
  function checkToken(){
    const token = localStorage.getItem('token');
    if (!token) {
      localStorage.removeItem('user');
      return;
    }
    try {
      const decoded = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);

      if (!decoded?.exp || decoded.exp <= now || !decoded?.userInfo) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('expired token');
        return;
      }
      // else console.log('Welcome ', decoded.userInfo.name);

    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    }
  checkToken();  
  // Initialize from localStorage
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [access, setAccess] = useState(() => {
    const saved = localStorage.getItem('access');
    return saved ? saved : 'public';
  });

  const [tab, setTab] = useState(() => {
    const saved = localStorage.getItem('tab');
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
    if(access) localStorage.setItem('access', access);
    else localStorage.removeItem('access');
  }, [access]);

  useEffect(() => {
    localStorage.setItem('tab', JSON.stringify(tab));
  }, [tab]);

  return (
    <AuthContext.Provider value={{ user, setUser, tab, setTab , isEvent, setIsEvent, access, setAccess}}>
      {children}
    </AuthContext.Provider>
  );
};



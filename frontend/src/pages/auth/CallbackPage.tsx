import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function CallbackPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
      localStorage.setItem('rt', refreshToken);
      fetch('https://git-analyser-production.up.railway.app/api/v1/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      }).then(r => r.json()).then(user => {
        setAuth(user, accessToken);
        navigate('/dashboard');
      }).catch(() => navigate('/login'));
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>
      <p style={{fontFamily:'Arial',fontSize:18}}>Signing you in...</p>
    </div>
  );
}

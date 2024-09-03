import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente que automaticamente faz scroll para o topo da página
 * sempre que a rota muda
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll para o topo da página quando a rota muda
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // Scroll suave
    });
  }, [pathname]);

  return null; // Este componente não renderiza nada
};

export default ScrollToTop;
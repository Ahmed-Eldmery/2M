import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import WaitingOutsideFixedPopup from '../WaitingOutsideFixedPopup';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [sidebarWidth, setSidebarWidth] = useState(256);

  useEffect(() => {
    const handleResize = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        setSidebarWidth(sidebar.offsetWidth);
      }
    };

    handleResize();

    const observer = new MutationObserver(handleResize);
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div 
        className="transition-all duration-300"
        style={{ marginRight: sidebarWidth }}
      >
        <Header />
        <main className="p-6 animate-fade-in">
          {children}
        </main>
      </div>
      <WaitingOutsideFixedPopup />
    </div>
  );
};

export default MainLayout;

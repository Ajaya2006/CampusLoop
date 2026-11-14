import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileNav from './MobileNav';
import ScrollToTop from './ScrollToTop';
import PageTransition from './PageTransition';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main id="main" className="page-wrap w-full flex-1 pb-24 pt-6 md:pb-10">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}

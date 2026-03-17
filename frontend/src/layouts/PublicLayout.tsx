import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import type { Role } from '../types/auth';

interface Props {
  role: Role | null;
  setRole: (role: Role | null) => void;
}

const PublicLayout = ({role, setRole}: Props) => {
  return (
    <>
      <Navbar role={role} setRole={setRole} />
      <main className="flex-1 pt-24 bg-gray-50 w-full">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PublicLayout;

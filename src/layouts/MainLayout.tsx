import { Outlet, useLocation, useParams } from 'react-router-dom';
import Navbar from '../components/global/Navbar';
import Footer from '../components/global/Footer';
import { getCourseBySlug } from '../services/courses';

export default function MainLayout() {
  const { courseSlug } = useParams();
  const { pathname } = useLocation();
  const isCourseOverview =
    Boolean(courseSlug) && pathname.split('/').filter(Boolean).length === 1;
  const courseName = isCourseOverview
    ? getCourseBySlug(courseSlug!)?.title
    : undefined;

  return (
    <>
      <Navbar courseName={courseName} />
      <Outlet />
      <Footer />
    </>
  );
}

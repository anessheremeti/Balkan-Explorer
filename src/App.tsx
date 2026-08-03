import Mainpage from './pages/Mainpage';
import { Route, Routes } from 'react-router';
import SignUp  from './pages/SignUp/SignUp';
import Login from './pages/Login/Login,';
import CommunityPage from './pages/Community/Community';
import ContactUs from './pages/ContactUs/ContactUs';
import AboutUsPage from './pages/AboutUs/AbousUs';
import TravelTipsPage from './pages/TravelTips/TravelTips';
import DestinationsPage from './pages/Destinations/Destinations';
import DestinationDetail from './pages/DestinationDetail/DestinationDetail';
import HelpCenterPage from './pages/HelpCenter/HelpCenter';
import HowItWorks from './pages/HowItWorks';
import ScrollToTop from './hooks/scrollToTop';
import AppSettings from './pages/AppSettings/AppSettings';
import AccountSettings from './pages/AccountSettings/AccountSettings';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/ResetPassword/ResetPassword';
import MyTravels from './pages/MyTravels/MyTravels';
import PageTracker from './components/Analytics/PageTracker';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import AdminDashboard from './pages/Admin';
import ItineraryBuilder from './pages/Features/ItineraryBuilder';
import RouteMapping from './pages/Features/RouteMapping';
import PDFExport from './pages/Features/PDFExport';
import Support from './pages/Features/Support';
import Privacy from './pages/Privacy/Privacy';
import CookieConsent from './components/CookieConsent/CookieConsent';

function App() {
  return (
    <>

    <ScrollToTop />
    <PageTracker />
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Mainpage />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path='contact' element={<ContactUs />} />
      <Route path='/destinations' element={<DestinationsPage />} />
      <Route path='/destination/:id' element={<DestinationDetail />} />
      <Route path='/help-center' element={<HelpCenterPage />} />
      <Route path="how-it-works" element={<HowItWorks />} />
      <Route path='/about' element={<AboutUsPage />} />
      <Route path='/travel-tips' element={<TravelTipsPage />} />
      <Route path='/features/itinerary-builder' element={<ItineraryBuilder />} />
      <Route path='/features/route-mapping' element={<RouteMapping />} />
      <Route path='/features/pdf-export' element={<PDFExport />} />
      <Route path='/features/support' element={<Support />} />
      <Route path='/privacy' element={<Privacy />} />

      {/* Protected routes — redirect to /login if no access_token */}
      <Route element={<ProtectedRoute />}>
        <Route path='/app-settings' element={<AppSettings />} />
        <Route path="account-settings" element={<AccountSettings />} />
        <Route path="/my-travels" element={<MyTravels />} />
        {/* Server re-checks admin rights on every /api/admin call */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
    <CookieConsent />
    </>
  )
}

export default App

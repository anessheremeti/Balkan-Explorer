import './App.css'
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
import {useState} from 'react';
function App() {
  const [isClicked, setIsClicked] = useState(false);
  return (
    <>
    
    <ScrollToTop />
    <Routes>
      <Route path="/" element={<Mainpage isClicked={isClicked} />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path='contact' element={<ContactUs />} />
      <Route path='/destinations' element={<DestinationsPage />} />
      <Route path='/destination/:id' element={<DestinationDetail />} />
      <Route path='/help-center' element={<HelpCenterPage />} />
      <Route path="how-it-works" element={<HowItWorks />} />
      <Route path='/about' element={<AboutUsPage />} />
      <Route path='/travel-tips' element={<TravelTipsPage />} />
      <Route path='/app-settings' element={<AppSettings />} />
       <Route path="account-settings" element={<AccountSettings />} /> 
    </Routes>
    </>
  )
}

export default App

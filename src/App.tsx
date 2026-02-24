import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { FAQ } from './pages/FAQ';
import { Contact } from './pages/Contact';
import { Reseller } from './pages/Reseller';
import { Login } from './pages/Login';
import { Tos } from './pages/Tos';
import { Privacy } from './pages/Privacy';
import { CustomerDashboard } from './pages/dashboards/CustomerDashboard';
import { ResellerDashboard } from './pages/dashboards/ResellerDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { AdminStoreDashboard } from './pages/dashboards/AdminStoreDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetails from './pages/admin/AdminUserDetails';
import ContentDownloadRedirect from './pages/ContentDownloadRedirect';

function Layout() {
  const location = useLocation();
  const showHeader = !location.pathname.startsWith('/dashboard');

  return (
    <>
      {showHeader && <Header />}
      <Routes>
        {/* Backend download paths should not be handled by the SPA router. */}
        <Route path="/content/download/:id" element={<ContentDownloadRedirect />} />

        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:slug" element={<ProductDetail />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reseller" element={<Reseller />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tos" element={<Tos />} />
        <Route path="/privacy" element={<Privacy />} />

        <Route path="/dashboard/customer" element={<CustomerDashboard />} />
        <Route path="/dashboard/reseller" element={<ResellerDashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/admin/store" element={<AdminStoreDashboard />} />
        <Route path="/dashboard/admin/users" element={<AdminUsers />} />
        <Route path="/dashboard/admin/users/:id" element={<AdminUserDetails />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;

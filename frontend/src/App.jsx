import { Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import AdminLayout from './components/layout/AdminLayout';
import AuthLayout from './components/layout/AuthLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import NotificationCenter from './components/notifications/NotificationCenter';

import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Categories from './pages/Categories';
import ProductDetail from './pages/ProductDetail';
import SellerProfile from './pages/SellerProfile';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';

import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import VerifyStudent from './pages/VerifyStudent';
import MyListings from './pages/MyListings';
import SellItem from './pages/SellItem';
import EditListing from './pages/EditListing';
import Wishlist from './pages/Wishlist';
import Messages from './pages/Messages';
import Offers from './pages/Offers';
import Meetings from './pages/Meetings';
import Transactions from './pages/Transactions';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminListings from './pages/admin/AdminListings';
import AdminListingHealth from './pages/admin/AdminListingHealth';
import AdminReports from './pages/admin/AdminReports';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminActivity from './pages/admin/AdminActivity';

function MarketplaceLayout() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <WorkspaceLayout /> : <AppLayout />;
}

const protectedPage = (element, options = {}) => (
  <ProtectedRoute requireVerified={options.requireVerified} requireAdmin={options.requireAdmin}>
    {element}
  </ProtectedRoute>
);

export default function App() {
  return (
    <>
      <NotificationCenter />
      <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="categories" element={<Categories />} />
      </Route>

      <Route element={<MarketplaceLayout />}>
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="seller/:id" element={<SellerProfile />} />
        {/* Signed in: the workspace shell; signed out: the marketing shell. */}
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:conversationId" element={<Messages />} />
        <Route path="profile" element={protectedPage(<Profile />)} />
        <Route path="profile/edit" element={protectedPage(<ProfileEdit />)} />
        <Route path="verify" element={protectedPage(<VerifyStudent />)} />
        <Route path="my-listings" element={protectedPage(<MyListings />)} />
        <Route path="sell" element={protectedPage(<SellItem />, { requireVerified: true })} />
        <Route path="sell/:id/edit" element={protectedPage(<EditListing />, { requireVerified: true })} />
        <Route path="wishlist" element={protectedPage(<Wishlist />)} />
        <Route path="offers" element={protectedPage(<Offers />)} />
        <Route path="meetings" element={protectedPage(<Meetings />)} />
        <Route path="transactions" element={protectedPage(<Transactions />)} />
        <Route path="notifications" element={protectedPage(<Notifications />)} />
        <Route path="settings" element={protectedPage(<Settings />)} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="verifications" element={<AdminVerifications />} />
        <Route path="listings" element={<AdminListings />} />
        <Route path="listing-health" element={<AdminListingHealth />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="analytics" element={<AdminActivity />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
      </Routes>
    </>
  );
}

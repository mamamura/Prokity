import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotifProvider } from './contexts/NotifContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { SiteProvider, useSite } from './contexts/SiteContext';
import { ChatProvider } from './contexts/ChatContext';
import { Protected } from './components/Protected';
import BottomNav from './components/BottomNav';
import DesktopNav from './components/DesktopNav';
import ChatWidget from './components/ChatWidget';
import Home from './pages/Home';
import Categories from './pages/Categories';
import CategoryPage from './pages/Category';
import ProductPage from './pages/Product';
import CartPage from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Track from './pages/Track';
import Receipt from './pages/Receipt';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Addresses from './pages/Addresses';
import Wishlist from './pages/Wishlist';
import { ForgotPassword, ResetPassword } from './pages/PasswordReset';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import AdminLogin from './pages/AdminLogin';
import { Login, Signup } from './pages/Auth';
import { AdminLayout, AdminDashboard } from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminUsers from './pages/admin/Users';
import AdminCategoriesPage from './pages/admin/Categories';
import AdminAnalytics from './pages/admin/Analytics';
import AdminMessages from './pages/admin/Messages';
import AdminSettings from './pages/admin/Settings';
import AdminBanners from './pages/admin/Banners';
import AdminCoupons from './pages/admin/Coupons';
import AdminReviews from './pages/admin/Reviews';
import AdminNewsletter from './pages/admin/Newsletter';
import { Toaster } from './components/ui/toaster';
import { ADMIN_PATH } from './lib/admin-path';
import { Leaf } from 'lucide-react';

const AdminGate = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen grid place-items-center bg-neutral-950">
      <div className="text-emerald-400 flex items-center gap-2 text-sm"><Leaf className="w-4 h-4 animate-pulse" /> Loading…</div>
    </div>
  );
  if (!user || user.role !== 'admin') return <AdminLogin />;
  return children;
};

const Shell = ({ children }) => {
  const { pathname } = useLocation();
  const site = useSite();
  const hideNav = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/product/') || pathname.startsWith('/receipt/');
  const hideDesktopNav = pathname === '/login' || pathname === '/signup' || pathname.startsWith('/receipt/');
  return (
    <div className="app-shell">
      {!hideDesktopNav && <DesktopNav />}
      <div className="app-content">{children}</div>
      {!hideNav && <BottomNav />}
      {site.showChatWidget && <ChatWidget />}
    </div>
  );
};

const AppRoutes = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith(ADMIN_PATH)) {
    return (
      <Routes>
        <Route path={ADMIN_PATH} element={<AdminGate><AdminLayout /></AdminGate>}>
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="newsletter" element={<AdminNewsletter />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    );
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:slug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/order/:id" element={<OrderDetail />} />
        <Route path="/track" element={<Track />} />
        <Route path="/receipt/:orderNo" element={<Receipt />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<Protected><EditProfile /></Protected>} />
        <Route path="/profile/addresses" element={<Protected><Addresses /></Protected>} />
        <Route path="/wishlist" element={<Protected><Wishlist /></Protected>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/search" element={<Search />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
};

function App() {
  return (
    <AuthProvider>
      <SiteProvider>
        <CartProvider>
          <NotifProvider>
            <WishlistProvider>
              <ChatProvider>
                <BrowserRouter>
                  <AppRoutes />
                  <Toaster />
                </BrowserRouter>
              </ChatProvider>
            </WishlistProvider>
          </NotifProvider>
        </CartProvider>
      </SiteProvider>
    </AuthProvider>
  );
}

export default App;

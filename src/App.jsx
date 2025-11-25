import { Route, Routes, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ShoppingCart from './pages/CartPage';
import ShipperDetails from './pages/Shipper/ShipperDetails';
import SellerProductReport from './pages/Seller/SellerProductReport';
import LandingPage from './pages/Home/LandingPage';
import Promotion from './pages/promotion/Promotion';
import UserDetails from './pages/User/UserDetails';
import ProductReviews from './pages/Review/ProductReviews';
import LoginPage from './pages/Login/LoginPage';
import ProductListingPage from './pages/Products/ProductListingPage';
import SellerDashboardPage from './pages/Seller/SellerDashboardPage';
import AddProductPage from './pages/Seller/AddProductPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>} />

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <LandingPage />
        </ProtectedRoute>} />
      <Route path="/about" element=
        {<h1>About Page</h1>
      } />
      <Route path="/cart" element={
        <ProtectedRoute>
          <ShoppingCart />
        </ProtectedRoute>
      } />
      <Route path="/shipper-details" element={
        <ProtectedRoute>
          <ShipperDetails />
        </ProtectedRoute>
      } />
      <Route path="/seller-report" element={
        <ProtectedRoute>
          <SellerProductReport />
        </ProtectedRoute>
      } />
      <Route path="/seller-dashboard" element={
        <ProtectedRoute>
          <SellerDashboardPage />
        </ProtectedRoute>
      } />
      {/* Backwards-compatible aliases: some parts of the app/navigation use /seller/... paths */}
      <Route path="/seller/seller-dashboard" element={
        <ProtectedRoute>
          <SellerDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/seller" element={<Navigate to="/seller/seller-dashboard" replace />} />
      <Route path="/add-product" element={
        <ProtectedRoute>
          <AddProductPage />
        </ProtectedRoute>
      } />
      <Route path="/seller/add-product" element={
        <ProtectedRoute>
          <AddProductPage />
        </ProtectedRoute>
      } />
      <Route path="/promotion" element={
        <ProtectedRoute>
          <Promotion />
        </ProtectedRoute>
      } />
      <Route path="/user" element={
        <ProtectedRoute>
          <UserDetails />
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <ProtectedRoute>
          <ProductListingPage />
        </ProtectedRoute>
      } />
      <Route path="/review" element={
        <ProtectedRoute>
        <ProductReviews />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App


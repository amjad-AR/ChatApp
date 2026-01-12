import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/slices/authSlice';

const Profile = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl text-white">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200"
            title="Go back"
          >
            <span className="text-white text-lg">←</span>
          </button>
          <h2 className="text-2xl font-semibold">Profile</h2>
          <div className="w-8 h-8"></div> {/* Spacer for centering */}
        </div>
        <p className="text-gray-300 text-center mb-6 text-sm">
          Your account information
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm">Full Name</label>
            <p className="w-full mt-1 bg-white/5 border border-white/20 rounded-md p-2 text-white">
              {user?.name || 'N/A'}
            </p>
          </div>

          <div>
            <label className="text-gray-300 text-sm">Email</label>
            <p className="w-full mt-1 bg-white/5 border border-white/20 rounded-md p-2 text-white">
              {user?.email || 'N/A'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-md mt-4 font-medium bg-red-600 hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
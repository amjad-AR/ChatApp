import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, checkUserExists, clearError } from "../redux/slices/authSlice";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/chat");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
    } catch (err) {
      if (err.message.includes("User not found")) {
        // Check if user exists, if not, redirect to register
        const exists = await dispatch(checkUserExists(email)).unwrap();
        if (!exists) {
          navigate("/register");
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-xl text-white">
        <h2 className="text-2xl font-semibold mb-2 text-center">Login</h2>
        <p className="text-gray-300 text-center mb-6 text-sm">
          Enter your email and password to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/20 rounded-md p-2 focus:outline-none focus:border-[#8973b3]"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/20 rounded-md p-2 focus:outline-none focus:border-[#8973b3]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error.message || "Login failed"}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md mt-4 font-medium disabled:opacity-50"
            style={{ backgroundColor: "#8973b3" }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-300 mt-4">
          Don’t have an account?{" "}
          <Link to="/register" className="text-[#8973b3] underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

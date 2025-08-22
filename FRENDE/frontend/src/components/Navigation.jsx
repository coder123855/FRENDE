import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MobileNavigation from './MobileNavigation';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, User, MessageCircle, Settings, LogOut, Sparkles, Home, ShoppingBag } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { path: '/home', label: 'Home', icon: Home },
    { path: '/matching', label: 'Find Friends', icon: Heart },
    { path: '/chat', label: 'Chat', icon: MessageCircle },
    { path: '/store', label: 'Store', icon: ShoppingBag },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Frende
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">Find your friends</p>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                {/* Navigation Links */}
                <div className="flex items-center space-x-1 bg-background-secondary rounded-2xl p-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive(item.path)
                            ? 'bg-white text-primary-600 shadow-md'
                            : 'text-foreground-secondary hover:text-foreground hover:bg-white/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                
                {/* User Profile Section */}
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-border">
                  <div className="flex items-center space-x-3">
                                         <Avatar className="w-8 h-8 ring-2 ring-white shadow-sm">
                       <AvatarImage src={user?.profile_picture_url} alt={user?.name} />
                       <AvatarFallback className="bg-gray-200 text-gray-600 text-sm font-semibold">
                         {user?.name?.charAt(0) || 'U'}
                       </AvatarFallback>
                     </Avatar>
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">{user?.name || 'User'}</span>
                    </div>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-background-secondary"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-background-secondary transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:from-primary-600 hover:to-secondary-600 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <MobileNavigation />
        </div>
      </div>
    </nav>
  );
}

export default Navigation;

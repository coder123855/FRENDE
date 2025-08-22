import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, Mail, Lock, User, AtSign, ArrowRight, AlertCircle, CheckCircle, Sparkles, Upload, ArrowLeft } from 'lucide-react';

function RegisterForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    username: '',
    age: '',
    community: '',
    bio: '',
    profilePicture: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register, error } = useAuth();
  const navigate = useNavigate();

  // Helper function to count words
  const countWords = (text) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1 fields
      if (!userData.email || !userData.password || !userData.confirmPassword || !userData.name || !userData.username) {
        alert('Please fill in all fields');
        return;
      }
      if (userData.password !== userData.confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      if (userData.password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep === 1) {
      handleNext();
      return;
    }
    
    setIsLoading(true);
    
    const result = await register({
      email: userData.email,
      password: userData.password,
      name: userData.name,
      username: userData.username,
      age: userData.age,
      community: userData.community,
      profile_text: userData.bio,
      profile_picture: userData.profilePicture
    });
    
    if (result.success) {
      console.log('Registration successful');
    }
    setIsLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for bio field to enforce word limit
    if (name === 'bio') {
      const wordCount = countWords(value);
      if (wordCount > 100) {
        return; // Don't update if over word limit
      }
    }
    
    setUserData({
      ...userData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUserData({
        ...userData,
        profilePicture: file
      });
    }
  };

  const isPasswordMatch = userData.password && userData.confirmPassword && userData.password === userData.confirmPassword;
  const isPasswordValid = userData.password && userData.password.length >= 8;
  const bioWordCount = countWords(userData.bio);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-2">
            Join Frende
          </h1>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of 2</span>
            <span>{Math.round((currentStep / 2) * 100)}%</span>
          </div>
          <Progress value={(currentStep / 2) * 100} className="h-2" />
        </div>

        {/* Registration Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              {currentStep === 1 ? 'Account Details' : 'Profile Setup'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {currentStep === 1 ? (
                // Step 1: Account Details
                <>
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        id="username"
                        name="username"
                        value={userData.username}
                        onChange={handleChange}
                        required
                        minLength={3}
                        maxLength={50}
                        className="pl-10 h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                        placeholder="Choose a username"
                        autoComplete="username"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        value={userData.name}
                        onChange={handleChange}
                        required
                        className="pl-10 h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                        placeholder="Enter your full name"
                        autoComplete="name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        id="email"
                        name="email"
                        value={userData.email}
                        onChange={handleChange}
                        required
                        className="pl-10 h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                        placeholder="Enter your email"
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="password"
                        id="password"
                        name="password"
                        value={userData.password}
                        onChange={handleChange}
                        required
                        minLength={8}
                        className="pl-10 h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                        placeholder="Create a password"
                        autoComplete="new-password"
                      />
                    </div>
                    {userData.password && (
                      <div className="flex items-center gap-2 text-xs mt-1">
                        {isPasswordValid ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
                        )}
                        <span className={isPasswordValid ? "text-green-600" : "text-yellow-600"}>
                          {isPasswordValid ? "Password meets requirements" : "Password must be at least 8 characters"}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={userData.confirmPassword}
                        onChange={handleChange}
                        required
                        className="pl-10 h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                      />
                    </div>
                    {userData.confirmPassword && (
                      <div className="flex items-center gap-2 text-xs mt-1">
                        {isPasswordMatch ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className={isPasswordMatch ? "text-green-600" : "text-red-600"}>
                          {isPasswordMatch ? "Passwords match" : "Passwords do not match"}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Step 2: Profile Setup
                <>
                  <div className="text-center">
                    <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-700 mb-4">
                      Profile Picture
                    </label>
                    <div className="relative inline-block">
                      <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-white shadow-lg">
                        <AvatarImage src={userData.profilePicture ? URL.createObjectURL(userData.profilePicture) : undefined} />
                        <AvatarFallback className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-xl font-semibold">
                          {userData.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <label htmlFor="profilePicture" className="absolute bottom-0 right-0 bg-primary-500 text-white p-2 rounded-full cursor-pointer hover:bg-primary-600 transition-colors">
                        <Upload className="w-4 h-4" />
                      </label>
                    </div>
                    <input
                      type="file"
                      id="profilePicture"
                      name="profilePicture"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                      Age
                    </label>
                    <Input
                      type="number"
                      id="age"
                      name="age"
                      value={userData.age}
                      onChange={handleChange}
                      min="13"
                      max="100"
                      className="h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                      placeholder="Enter your age"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="community" className="block text-sm font-medium text-gray-700 mb-2">
                      Community
                    </label>
                    <Input
                      type="text"
                      id="community"
                      name="community"
                      value={userData.community}
                      onChange={handleChange}
                      className="h-11 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg"
                      placeholder="e.g., University, Workplace, Hobby Group"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                      Bio (max 100 words)
                    </label>
                    <div className="relative">
                      <textarea
                        id="bio"
                        name="bio"
                        value={userData.bio}
                        onChange={handleChange}
                        maxLength={100}
                        className="pl-10 h-24 bg-white border-gray-300 focus:border-primary-500 focus:ring-primary-500 rounded-lg resize-none"
                        placeholder="Tell us about yourself (max 100 words)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {bioWordCount} / 100 words
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                {currentStep === 2 && (
                  <Button
                    type="button"
                    onClick={handleBack}
                    variant="outline"
                    className="flex-1 h-11 border-gray-300 hover:border-primary-500 hover:bg-primary-50"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-11 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {currentStep === 1 ? 'Processing...' : 'Creating Account...'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      {currentStep === 1 ? 'Next' : 'Create Account'}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RegisterForm;

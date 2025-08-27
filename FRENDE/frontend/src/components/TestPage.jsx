import React from 'react';

const TestPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">Frontend Styling Test</h1>
          <p className="text-xl text-gray-600">Testing all styling fixes and layout improvements</p>
        </div>

        {/* Test Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="modern-card text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Background Test</h3>
            <p className="text-gray-600 mb-4">This should have a beautiful gradient background</p>
            <div className="w-full h-20 bg-gradient-primary rounded-lg"></div>
          </div>

          <div className="modern-card text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Button Test</h3>
            <p className="text-gray-600 mb-4">Testing button styling and spacing</p>
            <div className="space-y-2">
              <button className="btn-modern w-full">Primary Button</button>
              <button className="btn-secondary w-full">Secondary Button</button>
            </div>
          </div>

          <div className="modern-card text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Layout Test</h3>
            <p className="text-gray-600 mb-4">Testing centering and responsive layout</p>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-accent rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Color Test */}
        <div className="modern-card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Color Palette Test</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="w-8 h-8 bg-blue-500 rounded mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Blue</span>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="w-8 h-8 bg-green-500 rounded mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Green</span>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="w-8 h-8 bg-purple-500 rounded mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Purple</span>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="w-8 h-8 bg-orange-500 rounded mx-auto mb-2"></div>
              <span className="text-sm text-gray-600">Orange</span>
            </div>
          </div>
        </div>

        {/* Typography Test */}
        <div className="modern-card mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Typography Test</h2>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">Heading 1 - Large Title</h1>
            <h2 className="text-3xl font-semibold text-gray-800">Heading 2 - Section Title</h2>
            <h3 className="text-2xl font-medium text-gray-700">Heading 3 - Subsection</h3>
            <p className="text-lg text-gray-600">Body text - This is a paragraph with good readability and proper spacing.</p>
            <p className="text-base text-gray-500">Smaller text for secondary information and captions.</p>
          </div>
        </div>

        {/* Spacing Test */}
        <div className="modern-card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Spacing & Layout Test</h2>
          <div className="space-y-6">
            <div className="flex flex-wrap justify-center gap-4">
              <button className="btn-modern">Button 1</button>
              <button className="btn-modern">Button 2</button>
              <button className="btn-modern">Button 3</button>
              <button className="btn-modern">Button 4</button>
            </div>
            <div className="text-center">
              <p className="text-gray-600">All buttons should be properly spaced and centered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;

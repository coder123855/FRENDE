import React, { useState } from 'react';
import { Button } from './ui/button';

const TestErrorBoundary = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('This is a test error to verify error boundaries work!');
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Error Boundary Test</h3>
      <p className="text-gray-600 mb-4">
        Click the button below to test the error boundary by throwing an error.
      </p>
      <Button 
        onClick={() => setShouldThrow(true)}
        variant="destructive"
      >
        Throw Test Error
      </Button>
    </div>
  );
};

export default TestErrorBoundary;

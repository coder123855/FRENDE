import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const CompatibilityDisplay = ({ compatibility, targetUser, onAccept, onReject, loading = false }) => {
  if (!compatibility) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          No compatibility data available
        </div>
      </Card>
    );
  }

  const { score, factors, details, random_factor } = compatibility;

  // Determine compatibility level and color
  const getCompatibilityLevel = (score) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 40) return { level: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Poor', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const compatibilityLevel = getCompatibilityLevel(score);

  return (
    <Card className="p-6 space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Compatibility Analysis</h3>
        {targetUser && (
          <div className="mb-4">
            <p className="text-gray-600">
              with <span className="font-medium">{targetUser.name || targetUser.username}</span>
            </p>
          </div>
        )}
      </div>

      {/* Overall Score */}
      <div className={`text-center p-4 rounded-lg ${compatibilityLevel.bgColor}`}>
        <div className={`text-3xl font-bold ${compatibilityLevel.color}`}>
          {score}/100
        </div>
        <div className={`text-lg font-medium ${compatibilityLevel.color}`}>
          {compatibilityLevel.level} Match
        </div>
        {random_factor !== 0 && (
          <div className="text-sm text-gray-500 mt-1">
            Random factor: {random_factor > 0 ? '+' : ''}{random_factor}
          </div>
        )}
      </div>

      {/* Detailed Factors */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-700">Compatibility Factors</h4>
        {Object.entries(factors).map(([factorName, factor]) => (
          <div key={factorName} className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-gray-700 capitalize">
                {factorName.replace('_', ' ')}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {factor.score}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${factor.score}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{factor.details}</p>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      {onAccept && onReject && (
        <div className="flex gap-3 pt-4">
          <Button
            onClick={onAccept}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Processing...' : 'Accept Match'}
          </Button>
          <Button
            onClick={onReject}
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading ? 'Processing...' : 'Reject Match'}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default CompatibilityDisplay; 
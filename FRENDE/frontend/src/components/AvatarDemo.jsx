import React from 'react';
import Avatar from './ui/avatar';
import DefaultAvatar from './ui/default-avatar';
import { Card } from './ui/card';

const AvatarDemo = () => {
  const demoUsers = [
    { name: "John Doe", src: null },
    { name: "Jane Smith", src: null },
    { name: "Bob Johnson", src: null },
    { name: "Alice Brown", src: null },
    { name: "Charlie Wilson", src: null },
    { name: null, src: null }, // No name, no image
  ];

  const sizes = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
  const variants = ["silhouette", "initials", "gradient"];

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Avatar Component Demo</h1>
        <p className="text-gray-600">Showcasing default avatar functionality for users without profile pictures</p>
      </div>

      {/* Default Avatar Variants */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Default Avatar Variants</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {variants.map(variant => (
            <div key={variant} className="space-y-4">
              <h3 className="text-lg font-medium capitalize">{variant}</h3>
              <div className="flex flex-wrap gap-4">
                {demoUsers.slice(0, 3).map((user, index) => (
                  <div key={index} className="text-center">
                    <DefaultAvatar 
                      size="lg" 
                      name={user.name} 
                      variant={variant}
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      {user.name || "No name"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Avatar Sizes */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Avatar Sizes</h2>
        <div className="space-y-4">
          {sizes.map(size => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-20 text-sm font-medium capitalize">{size}</span>
              <div className="flex gap-4">
                <DefaultAvatar size={size} name="John Doe" variant="gradient" />
                <DefaultAvatar size={size} name="Jane Smith" variant="initials" />
                <DefaultAvatar size={size} variant="silhouette" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Avatar Component with Fallback */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Avatar Component with Fallback</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {demoUsers.map((user, index) => (
            <div key={index} className="text-center space-y-2">
              <Avatar 
                src={user.src} 
                name={user.name}
                size="lg"
                variant="gradient"
              />
              <p className="text-xs text-gray-600">
                {user.name || "No name"}
              </p>
              <p className="text-xs text-gray-500">
                {user.src ? "Has image" : "No image"}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Error Handling Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Error Handling Demo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center space-y-2">
            <Avatar 
              src="https://invalid-url-that-will-fail.jpg" 
              name="John Doe"
              size="lg"
              variant="gradient"
            />
            <p className="text-xs text-gray-600">Invalid URL</p>
          </div>
          <div className="text-center space-y-2">
            <Avatar 
              src={null} 
              name="Jane Smith"
              size="lg"
              variant="initials"
            />
            <p className="text-xs text-gray-600">No image</p>
          </div>
          <div className="text-center space-y-2">
            <Avatar 
              src={null} 
              name={null}
              size="lg"
              variant="silhouette"
            />
            <p className="text-xs text-gray-600">No name, no image</p>
          </div>
          <div className="text-center space-y-2">
            <Avatar 
              src="https://via.placeholder.com/150/000000/FFFFFF?text=Valid" 
              name="Valid Image"
              size="lg"
            />
            <p className="text-xs text-gray-600">Valid image</p>
          </div>
        </div>
      </Card>

      {/* Usage Examples */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Basic Usage:</h3>
            <code className="text-sm text-gray-700">
              {`<Avatar src={user.profilePictureUrl} name={user.name} size="md" />`}
            </code>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">With Variants:</h3>
            <code className="text-sm text-gray-700">
              {`<Avatar src={null} name="John Doe" variant="gradient" size="lg" />`}
            </code>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Default Avatar Only:</h3>
            <code className="text-sm text-gray-700">
              {`<DefaultAvatar name="Jane Smith" variant="initials" size="xl" />`}
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AvatarDemo; 
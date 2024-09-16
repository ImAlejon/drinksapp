import React from 'react';
import Image from 'next/image';

export interface ConnectedUser {
  id: string;
  name: string;
  avatar_url: string;
}

interface ConnectedUsersProps {
  users: ConnectedUser[];
}

const ConnectedUsers: React.FC<ConnectedUsersProps> = ({ users }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {users.map(user => (
        <div key={user.id} className="flex flex-col items-center">
          {user.avatar_url ? (
            <Image 
              src={user.avatar_url} 
              alt={user.name} 
              width={40} 
              height={40} 
              className="rounded-full mb-1"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full mb-1 flex items-center justify-center">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-center">{user.name}</span>
        </div>
      ))}
    </div>
  );
};

export default ConnectedUsers;
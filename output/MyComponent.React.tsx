typescript
import React from 'react';

interface ProfileEditProps {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ username, email, phoneNumber, password }) => {
  return (
    <div className="flex flex-col bg-white p-0">
      <div className="absolute top-0 left-0 w-[390px] h-[188px] bg-purple-600"></div>
      <span className="absolute top-[298px] left-[89px] text-black text-base font-medium">{username}</span>
      <span className="absolute top-[54px] left-[208px] text-white text-sm font-normal">Edit Profile</span>
      <span className="absolute top-[362px] left-[89px] text-black text-base font-medium">{email}</span>
      <span className="absolute top-[441px] left-[89px] text-black text-base font-medium">{phoneNumber}</span>
      <span className="absolute top-[526px] left-[89px] text-black text-base font-medium">{password}</span>
      <span className="absolute top-[745px] left-[220px] text-white text-lg font-bold">Update</span>
      <span className="absolute top-[259px] left-[202px] text-black text-sm font-normal">Change Picture</span>
      <span className="absolute top-[395px] left-[101px] text-black text-sm font-normal">{email}</span>
      <span className="absolute top-[478px] left-[101px] text-black text-sm font-normal">{phoneNumber}</span>
      <span className="absolute top-[560px] left-[101px] text-black text-sm font-normal">{password}</span>
    </div>
  );
};

export default ProfileEdit;
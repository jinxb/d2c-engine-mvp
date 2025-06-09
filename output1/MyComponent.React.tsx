typescript
import React from 'react';

interface PersonalCenterProps {
  sections: {
    myDoctor: React.ReactNode;
    caseWindow: React.ReactNode;
    myWallet: React.ReactNode;
    privacyPolicy: React.ReactNode;
    help: React.ReactNode;
    settings: React.ReactNode;
  };
}

const PersonalCenter: React.FC<PersonalCenterProps> = ({ sections }) => {
  return (
    <div className="flex flex-col gap-20 p-0 bg-white">
      <div className="flex flex-col gap-20 p-0 bg-white">
        <div className="flex flex-row gap-10 p-0 bg-white">
          {sections.myDoctor}
        </div>
        <div className="flex flex-row gap-10 p-0 bg-white">
          {sections.caseWindow}
        </div>
        <div className="flex flex-row gap-10 p-0 bg-white">
          {sections.myWallet}
        </div>
        <div className="flex flex-row gap-10 p-0 bg-white">
          {sections.privacyPolicy}
        </div>
        <div className="flex flex-row gap-10 p-0 bg-white">
          {sections.help}
        </div>
        <div className="flex flex-row gap-10 p-0 bg-white">
          {sections.settings}
        </div>
      </div>
      <div className="flex flex-col gap-0 p-0 bg-white">
        {/* Background content here */}
      </div>
      <div className="flex flex-row gap-36 p-0 bg-white">
        {/* Avatar content here */}
      </div>
      <div className="flex flex-col gap-20 p-0 bg-white">
        {/* List content here */}
      </div>
    </div>
  );
};

export default Personal Center;